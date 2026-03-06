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
 *
 * The loop lives here in a step (not in the workflow constructor) because:
 * - Steps are plain async functions — no Medusa constructor constraints apply
 * - transform() in a workflow constructor must be synchronous
 * - workflow.run() can be called from a step
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

                if (order.status !== "Despatched") {
                    logger.info(
                        `[RoyalMail] Fulfillment ${fulfillment.fulfillmentId} status: ${order.status} — skipping`
                    )
                    continue
                }

                // Call createShipmentWorkflow for this fulfillment
                await createShipmentWorkflow(container).run({
                    input: {
                        id: fulfillment.fulfillmentId,
                        labels: [
                            {
                                tracking_number: order.trackingNumber ?? "",
                                tracking_url: order.trackingUrl ?? "",
                                label_url: "",
                            },
                        ],
                    },
                })

                shipped++
                logger.info(
                    `[RoyalMail] Fulfillment ${fulfillment.fulfillmentId} marked as shipped. Tracking: ${order.trackingNumber}`
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