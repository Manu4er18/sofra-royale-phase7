import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";

const AVATAR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function normalizeMime(value: string) {
  return value.split(";")[0]?.trim().toLowerCase() ?? "";
}

function fileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

function signCloudinaryUpload(params: Record<string, string>) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1")
    .update(`${payload}${process.env.CLOUDINARY_API_SECRET}`)
    .digest("hex");
}

async function uploadAvatarToLocal(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = EXT_BY_MIME[normalizeMime(file.type)] || fileExtension(file) || "jpg";
  const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
  const relativeUrl = `/uploads/account/avatar/${fileName}`;
  const targetDir = path.join(process.cwd(), "public", "uploads", "account", "avatar");

  await mkdir(targetDir, { recursive: true });
  await writeFile(path.join(targetDir, fileName), bytes);

  return relativeUrl;
}

async function uploadAvatarToCloudinary(file: File) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return null;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const uploadParams = {
    folder: "sofra-royale/account/avatar",
    timestamp,
  };
  const uploadData = new FormData();
  uploadData.set(
    "file",
    new Blob([await file.arrayBuffer()], { type: normalizeMime(file.type) }),
    file.name || "avatar.jpg",
  );
  uploadData.set("api_key", apiKey);
  uploadData.set("folder", uploadParams.folder);
  uploadData.set("timestamp", timestamp);
  uploadData.set("signature", signCloudinaryUpload(uploadParams));

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: uploadData },
  );
  if (!response.ok) return null;

  const result = (await response.json()) as { secure_url?: string };
  return result.secure_url?.startsWith("https://res.cloudinary.com/")
    ? result.secure_url
    : null;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
  }

  if (!checkRateLimit(`account:avatar:${session.user.id}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Zu viele Uploads - bitte kurz warten." },
      { status: 429 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Datei gefunden." }, { status: 400 });
  }

  const mimeType = normalizeMime(file.type);
  if (!AVATAR_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: "Bitte JPG, PNG, WebP oder GIF hochladen." },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Das Profilbild darf maximal 5 MB groß sein." },
      { status: 400 },
    );
  }

  const imageUrl =
    (await uploadAvatarToCloudinary(file)) ?? (await uploadAvatarToLocal(file));

  await db.user.update({
    where: { id: session.user.id },
    data: { image: imageUrl },
  });

  return NextResponse.json({ imageUrl });
}
