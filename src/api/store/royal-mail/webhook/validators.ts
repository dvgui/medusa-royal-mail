import { z } from "zod"

export const RoyalMailWebhookSchema = z.object({
    orderReference: z.string(),
    orderIdentifier: z.number().optional(),
    orderStatus: z.string(),
    trackingNumber: z.string().optional(),
    trackingUrl: z.string().optional(),
})

export type RoyalMailWebhookSchema = z.infer<typeof RoyalMailWebhookSchema>
