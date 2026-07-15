import { z } from "zod";

const chatAttachmentUrlSchema = z
  .string()
  .trim()
  .refine(
    (u) =>
      u.startsWith("/uploads/chat/") ||
      u.startsWith("https://res.cloudinary.com/") ||
      u.startsWith("https://images.unsplash.com/"),
    "Nur Chat-/Cloudinary-/Unsplash-Medien erlaubt.",
  );

export const startChatSchema = z
  .object({
    /** First message. */
    message: z.string().trim().max(2000).optional().or(z.literal("")),
    imageUrl: chatAttachmentUrlSchema.nullish(),
    subject: z.string().trim().max(120).optional(),
    /** Guest contact (ignored for logged-in users). */
    guestName: z.string().trim().max(100).optional(),
    guestEmail: z.string().trim().email().optional().or(z.literal("")),
  })
  .refine((value) => Boolean(value.message?.trim() || value.imageUrl), {
    message: "Bitte Text oder Bild senden.",
  });

export type StartChatInput = z.infer<typeof startChatSchema>;

export const sendMessageSchema = z
  .object({
    conversationId: z.string().cuid(),
    body: z.string().trim().max(2000).optional().or(z.literal("")),
    imageUrl: chatAttachmentUrlSchema.nullish(),
  })
  .refine((value) => Boolean(value.body?.trim() || value.imageUrl), {
    message: "Bitte Text oder Bild senden.",
  });

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const staffReplySchema = z
  .object({
    conversationId: z.string().cuid(),
    body: z.string().trim().max(2000).optional().or(z.literal("")),
    imageUrl: chatAttachmentUrlSchema.nullish(),
  })
  .refine((value) => Boolean(value.body?.trim() || value.imageUrl), {
    message: "Bitte Text oder Bild senden.",
  });

export const chatNoteSchema = z.object({
  conversationId: z.string().cuid(),
  note: z.string().trim().max(1000),
});
