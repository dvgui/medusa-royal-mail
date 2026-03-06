import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { handleRoyalMailStatusUpdateWorkflow } from "../../../../workflows/handle-royal-mail-status-update"
import { RoyalMailWebhookSchema } from "./validators"

export async function POST(
    req: MedusaRequest<RoyalMailWebhookSchema>,
    res: MedusaResponse
) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

    logger.info("[Royal Mail Plugin] Received Webhook Payload")
    logger.info(JSON.stringify(req.validatedBody, null, 2))

    // Basic validation - check for secret if configured
    const secret = req.query.secret
    if (process.env.ROYAL_MAIL_WEBHOOK_SECRET && secret !== process.env.ROYAL_MAIL_WEBHOOK_SECRET) {
        logger.warn("[Royal Mail Plugin] Unauthorized Webhook attempt.")
        return res.status(401).json({ message: "Unauthorized" })
    }

    try {
        const { result } = await handleRoyalMailStatusUpdateWorkflow(req.scope).run({
            input: req.validatedBody
        })

        return res.status(200).json({
            message: "Webhook processed",
            success: !!result
        })
    } catch (error: any) {
        logger.error(`[Royal Mail Plugin] Error processing Webhook: ${error.message}`)
        return res.status(500).json({ message: "Internal Server Error" })
    }
}
