import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { STAFF_ROLES } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CHAT_COOKIE } from "@/lib/services/chat";

type MediaKind = "image" | "video" | "audio" | "document";

const MEDIA_RULES: Record<
  MediaKind,
  { maxBytes: number; mimeTypes: Set<string>; fallbackExt: string }
> = {
  image: {
    maxBytes: 8 * 1024 * 1024,
    mimeTypes: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
    fallbackExt: "jpg",
  },
  video: {
    maxBytes: 50 * 1024 * 1024,
    mimeTypes: new Set(["video/mp4", "video/webm", "video/quicktime"]),
    fallbackExt: "webm",
  },
  audio: {
    maxBytes: 20 * 1024 * 1024,
    mimeTypes: new Set([
      "audio/mpeg",
      "audio/mp4",
      "audio/aac",
      "audio/ogg",
      "audio/wav",
      "audio/wave",
      "audio/x-wav",
      "audio/webm",
      "audio/x-m4a",
    ]),
    fallbackExt: "webm",
  },
  document: {
    maxBytes: 15 * 1024 * 1024,
    mimeTypes: new Set([
      "application/pdf",
      "text/plain",
      "text/csv",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]),
    fallbackExt: "pdf",
  },
};

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "audio/x-m4a": "m4a",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

function signCloudinaryUpload(params: Record<string, string>) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1")
    .update(`${payload}${process.env.CLOUDINARY_API_SECRET}`)
    .digest("hex");
}

function normalizeKind(
  rawKind: FormDataEntryValue | null,
  file: File,
): MediaKind {
  const mimeType = normalizeMime(file.type);
  if (
    rawKind === "image" ||
    rawKind === "video" ||
    rawKind === "audio" ||
    rawKind === "document"
  ) {
    return rawKind;
  }
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (MEDIA_RULES.document.mimeTypes.has(mimeType)) return "document";
  return "image";
}

function normalizeMime(value: string) {
  return value.split(";")[0]?.trim().toLowerCase() ?? "";
}

function fileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

function isAllowedFile(file: File, kind: MediaKind) {
  const mimeType = normalizeMime(file.type);
  if (MEDIA_RULES[kind].mimeTypes.has(mimeType)) return true;
  if (kind !== "audio") return false;

  return new Set(["aac", "m4a", "mp3", "mp4", "ogg", "wav", "webm"]).has(
    fileExtension(file),
  );
}

async function canAttachToConversation(conversationId: string | null) {
  if (!conversationId) return true;

  const session = await auth();
  const conversation = await db.chatConversation.findUnique({
    where: { id: conversationId },
    select: { id: true, customerId: true },
  });

  if (!conversation) return false;
  if (session?.user && STAFF_ROLES.includes(session.user.role)) return true;
  if (conversation.customerId)
    return conversation.customerId === session?.user?.id;

  const token = (await cookies()).get(CHAT_COOKIE)?.value;
  return token === conversation.id;
}

async function uploadToLocalPublic(file: File, kind: MediaKind) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext =
    EXT_BY_MIME[normalizeMime(file.type)] ||
    fileExtension(file) ||
    MEDIA_RULES[kind].fallbackExt;
  const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
  const relativeUrl = `/uploads/chat/${kind}/${fileName}`;
  const targetDir = path.join(process.cwd(), "public", "uploads", "chat", kind);

  await mkdir(targetDir, { recursive: true });
  await writeFile(path.join(targetDir, fileName), bytes);

  return relativeUrl;
}

async function uploadToCloudinary(file: File, kind: MediaKind) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return null;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const uploadParams = {
    folder: `sofra-royale/chat/${kind}`,
    timestamp,
  };
  const uploadData = new FormData();
  uploadData.set(
    "file",
    new Blob([await file.arrayBuffer()], { type: normalizeMime(file.type) }),
    file.name || `chat-${kind}.${MEDIA_RULES[kind].fallbackExt}`,
  );
  uploadData.set("api_key", apiKey);
  uploadData.set("folder", uploadParams.folder);
  uploadData.set("timestamp", timestamp);
  uploadData.set("signature", signCloudinaryUpload(uploadParams));

  const resourceType =
    kind === "image" ? "image" : kind === "document" ? "raw" : "video";
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    {
      method: "POST",
      body: uploadData,
    },
  );

  if (!response.ok) return null;

  const result = (await response.json()) as { secure_url?: string };
  return result.secure_url?.startsWith("https://res.cloudinary.com/")
    ? result.secure_url
    : null;
}

export async function POST(request: Request) {
  const rateKey =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`chat:upload:${rateKey}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "Zu viele Uploads — bitte kurz warten." },
      { status: 429 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("media") ?? formData.get("image");
  const conversationId = formData.get("conversationId");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Keine Datei gefunden." },
      { status: 400 },
    );
  }

  const kind = normalizeKind(formData.get("kind"), file);
  const rules = MEDIA_RULES[kind];

  if (!isAllowedFile(file, kind)) {
    return NextResponse.json(
      { error: "Dieser Dateityp ist für den Chat nicht erlaubt." },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > rules.maxBytes) {
    return NextResponse.json(
      {
        error: `Die Datei darf maximal ${Math.round(
          rules.maxBytes / 1024 / 1024,
        )} MB groß sein.`,
      },
      { status: 400 },
    );
  }

  const normalizedConversationId =
    typeof conversationId === "string" && conversationId.trim()
      ? conversationId.trim()
      : null;

  if (!(await canAttachToConversation(normalizedConversationId))) {
    return NextResponse.json(
      { error: "Kein Zugriff auf diese Unterhaltung." },
      { status: 403 },
    );
  }

  const uploadedUrl =
    (await uploadToCloudinary(file, kind)) ??
    (await uploadToLocalPublic(file, kind));

  return NextResponse.json({ imageUrl: uploadedUrl, kind });
}
