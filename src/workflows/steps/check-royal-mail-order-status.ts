import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaContainer } from "@medusajs/framework/types"
import { RoyalMailClient } from "../../lib/royal-mail-client/client"
import { RoyalMailOrderDetails } from "../../lib/royal-mail-client/types"

export interface CheckRoyalMailOrderStatusStepInput {
    rmOrderIdentifier: string
}

/**
 * Calls client.getOrder() for a single Click & Drop order identifier.
 * Returns null on any error so a single bad order doesn't abort the whole poll.
 */
export const checkRoyalMailOrderStatusStep = createStep(
    "check-royal-mail-order-status",
    async (
        input: CheckRoyalMailOrderStatusStepInput,
        { container }: { container: MedusaContainer }
    ): Promise<StepResponse<RoyalMailOrderDetails | null>> => {
        const logger = container.resolve("logger")

        const apiKey = process.env.ROYAL_MAIL_API_KEY
        if (!apiKey) {
            throw new Error("ROYAL_MAIL_API_KEY environment variable is not set")
        }

        const client = new RoyalMailClient({ apiKey }, logger)

        try {
            const order = await client.getOrder(input.rmOrderIdentifier)
            return new StepResponse(order)
        } catch (error: any) {
            logger.warn(
                `[RoyalMail] Could not fetch status for order ${input.rmOrderIdentifier}: ${error.message}`
            )
            return new StepResponse(null)
        }
    }
)