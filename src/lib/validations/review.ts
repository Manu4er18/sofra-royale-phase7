import { z } from "zod";

export const reviewSchema = z.object({
  productId: z.string().cuid(),
  orderId: z.string().cuid().optional(),
  rating: z
    .number()
    .int()
    .min(1, "Bitte eine Bewertung von 1–5 Sternen wählen.")
    .max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  body: z
    .string()
    .trim()
    .min(10, "Bitte mindestens 10 Zeichen schreiben.")
    .max(2000),
  imageUrls: z
    .array(z.string().trim().url())
    .max(4, "Maximal 4 Fotos hochladen.")
    .optional()
    .default([]),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

export const updateReviewSchema = reviewSchema
  .omit({ productId: true, orderId: true, imageUrls: true })
  .extend({ reviewId: z.string().cuid() });

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
