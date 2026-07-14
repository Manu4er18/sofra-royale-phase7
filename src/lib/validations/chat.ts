import { z } from "zod";

export const startChatSchema = z.object({
  /** First message. */
  message: z.string().trim().min(1, "Bitte eine Nachricht eingeben.").max(2000),
  subject: z.string().trim().max(120).optional(),
  /** Guest contact (ignored for logged-in users). */
  guestName: z.string().trim().max(100).optional(),
  guestEmail: z.string().trim().email().optional().or(z.literal("")),
});

export type StartChatInput = z.infer<typeof startChatSchema>;

export const sendMessageSchema = z.object({
  conversationId: z.string().cuid(),
  body: z.string().trim().min(1).max(2000),
  imageUrl: z
    .string()
    .trim()
    .url()
    .refine(
      (u) =>
        u.startsWith("https://res.cloudinary.com/") ||
        u.startsWith("https://images.unsplash.com/"),
      "Nur Cloudinary-/Unsplash-Bilder erlaubt.",
    )
    .optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const staffReplySchema = z.object({
  conversationId: z.string().cuid(),
  body: z.string().trim().min(1).max(2000),
});

export const chatNoteSchema = z.object({
  conversationId: z.string().cuid(),
  note: z.string().trim().max(1000),
});
