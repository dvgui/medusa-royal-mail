import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaContainer } from "@medusajs/framework/types"
import { RoyalMailClient } from "../../lib/royal-mail-client/client"
import { PendingRoyalMailFulfillment } from "./find-pending-royal-mail-fulfillments"
import { createShipmentWorkflow } from "@medusajs/medusa/core-flows"

export interface ProcessRoyalMailFulfillmentsStepOutput {
    processed: number
    shipped: number
}

/**
 * Loops over all pending fulfillments, checks each one against the RM API,
 * and creates a Medusa shipment for any that are Despatched.
 */
export const processRoyalMailFulfillmentsStep = createStep(
    "process-royal-mail-fulfillments",
    async (
        input: { fulfillments: PendingRoyalMailFulfillment[] },
        { container }: { container: MedusaContainer }
    ): Promise<StepResponse<ProcessRoyalMailFulfillmentsStepOutput>> => {
        const logger = container.resolve("logger")

        const apiKey = process.env.ROYAL_MAIL_API_KEY
        if (!apiKey) {
            throw new Error("ROYAL_MAIL_API_KEY environment variable is not set")
        }

        const client = new RoyalMailClient({ apiKey }, logger)

        let shipped = 0

        for (const fulfillment of input.fulfillments) {
            try {
                const order = await client.getOrder(fulfillment.rmOrderIdentifier)

                if (!order) {
                    logger.info(
                        `[RoyalMail] Fulfillment ${fulfillment.fulfillmentId} — RM order ${fulfillment.rmOrderIdentifier} not found, skipping`
                    )
                    continue
                }

                if (!order.shippedOn) {
                    logger.info(
                        `[RoyalMail] Fulfillment ${fulfillment.fulfillmentId} not yet despatched — skipping`
                    )
                    continue
                }

                const trackingNumber = order.trackingNumber ?? ""
                const trackingUrl = trackingNumber
                    ? `https://www.royalmail.com/track-your-item#/tracking-results/${trackingNumber}`
                    : ""

                await createShipmentWorkflow(container).run({
                    input: {
                        id: fulfillment.fulfillmentId,
                        labels: [
                            {
                                tracking_number: trackingNumber,
                                tracking_url: trackingUrl,
                                label_url: "",
                            },
                        ],
                    },
                })

                shipped++
                logger.info(
                    `[RoyalMail] Fulfillment ${fulfillment.fulfillmentId} marked as shipped. Tracking: ${trackingNumber}`
                )
            } catch (error: any) {
                // Non-fatal per fulfillment — log and continue to the next one
                logger.error(
                    `[RoyalMail] Error processing fulfillment ${fulfillment.fulfillmentId}: ${error.message}`
                )
            }
        }

        return new StepResponse({
            processed: input.fulfillments.length,
            shipped,
        })
    }
)