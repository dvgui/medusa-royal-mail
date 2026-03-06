import { MedusaContainer } from "@medusajs/framework/types"
import { pollRoyalMailFulfillmentsWorkflow } from "../workflows/poll-royal-mail-fulfillments"

/**
 * Scheduled job — polls Royal Mail Click & Drop for despatch updates.
 *
 * Royal Mail does not support outbound webhooks, so polling is the only
 * supported integration pattern.
 */
export default async function pollRoyalMailFulfillments(
    container: MedusaContainer
): Promise<void> {
    const logger = container.resolve("logger")
    logger.info("[RoyalMail] Starting fulfillment status poll…")

    try {
        const { result } = await pollRoyalMailFulfillmentsWorkflow(container).run({
            input: {},
        })

        logger.info(
            `[RoyalMail] Poll complete — processed: ${result.processed}, shipped: ${result.shipped}`
        )
    } catch (error: any) {
        // Don't rethrow — a failed poll should not crash the Medusa worker.
        logger.error(`[RoyalMail] Polling workflow failed: ${error.message}`)
    }
}

export const config = {
    name: "poll-royal-mail-fulfillments",
    schedule: {
        /**
         * Interval in milliseconds — 5 minutes.
         */
        interval: 1 * 60 * 1000,
    },
}