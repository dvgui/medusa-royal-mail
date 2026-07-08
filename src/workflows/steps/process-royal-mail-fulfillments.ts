import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
    IEventBusModuleService,
    IFulfillmentModuleService,
    MedusaContainer,
} from "@medusajs/framework/types"
import {
    FulfillmentWorkflowEvents,
    Modules,
} from "@medusajs/framework/utils"
import { RoyalMailClient } from "../../lib/royal-mail-client/client"
import { PendingRoyalMailFulfillment } from "./find-pending-royal-mail-fulfillments"
import { createShipmentWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Emitted when Royal Mail has printed the label and allocated a tracking
 * number, but the parcel has NOT yet been despatched. peptide-admin's
 * `order-prepared` subscriber mirrors this literal (cross-repo — keep in sync)
 * and sends the "your order is packed and ready" email.
 */
export const ROYAL_MAIL_ORDER_PREPARED_EVENT = "royal_mail.order_prepared"

export interface RoyalMailOrderPreparedEventData {
    id: string
    tracking_number: string
}

export interface ProcessRoyalMailFulfillmentsStepOutput {
    processed: number
    prepared: number
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

        const eventBus = container.resolve<IEventBusModuleService>(
            Modules.EVENT_BUS
        )
        const fulfillmentModule = container.resolve<IFulfillmentModuleService>(
            Modules.FULFILLMENT
        )

        let prepared = 0
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

                const trackingNumber = order.trackingNumber ?? ""

                // STAGE 1 — label printed & tracking allocated, not yet
                // despatched. Notify the customer their order is prepared
                // exactly once, WITHOUT marking it shipped (it stays in the
                // poll until RM reports despatch). When the tracking number and
                // despatch surface together, the `!order.shippedOn` guard is
                // already false, so this is skipped and only the shipped email
                // fires — no spurious "prepared" note.
                if (
                    trackingNumber &&
                    !order.shippedOn &&
                    !fulfillment.preparedNotifiedAt
                ) {
                    await eventBus.emit({
                        name: ROYAL_MAIL_ORDER_PREPARED_EVENT,
                        data: {
                            id: fulfillment.fulfillmentId,
                            tracking_number: trackingNumber,
                        } satisfies RoyalMailOrderPreparedEventData,
                    })

                    const existing = await fulfillmentModule.retrieveFulfillment(
                        fulfillment.fulfillmentId
                    )
                    await fulfillmentModule.updateFulfillment(
                        fulfillment.fulfillmentId,
                        {
                            data: {
                                ...((existing.data as Record<string, unknown>) ??
                                    {}),
                                rmPreparedNotifiedAt: new Date().toISOString(),
                            },
                        }
                    )

                    prepared++
                    logger.info(
                        `[RoyalMail] Fulfillment ${fulfillment.fulfillmentId} prepared (label ready) — customer notified. Tracking: ${trackingNumber}`
                    )
                }

                // STAGE 2 — RM reports despatch (shippedOn). Mark the Medusa
                // shipment + fire the shipped email.
                if (!order.shippedOn) {
                    logger.info(
                        `[RoyalMail] Fulfillment ${fulfillment.fulfillmentId} not yet despatched — skipping shipment`
                    )
                    continue
                }

                await createShipmentWorkflow(container).run({
                    input: {
                        id: fulfillment.fulfillmentId,
                        labels: [
                            {
                                tracking_number: trackingNumber,
                                tracking_url: RoyalMailClient.trackingUrlFor(trackingNumber),
                                label_url: "",
                            },
                        ],
                    },
                })

                // createShipmentWorkflow only updates shipped_at; it does NOT
                // emit shipment.created (that event is only emitted by the
                // order-level createOrderShipmentWorkflow the admin UI calls).
                // Emit it manually so downstream subscribers (e.g. the order-
                // shipped email) fire for polled shipments too.
                await eventBus.emit({
                    name: FulfillmentWorkflowEvents.SHIPMENT_CREATED,
                    data: {
                        id: fulfillment.fulfillmentId,
                        no_notification: false,
                    },
                })

                shipped++
                logger.info(
                    `[RoyalMail] Fulfillment ${fulfillment.fulfillmentId} marked as shipped. Tracking: ${trackingNumber}`
                )
            } catch (error: any) {
                const msg = String(error?.message ?? error)

                // RM 400 "Order with provided id does not exist" is permanent —
                // the Click & Drop order was deleted (merged labels, manual
                // cleanup). Flag the fulfillment so the finder stops polling it.
                if (/Order with provided id does not exist/i.test(msg)) {
                    try {
                        const existing = await fulfillmentModule.retrieveFulfillment(
                            fulfillment.fulfillmentId
                        )
                        await fulfillmentModule.updateFulfillment(
                            fulfillment.fulfillmentId,
                            {
                                data: {
                                    ...((existing.data as Record<string, unknown>) ?? {}),
                                    rmPollTerminalError: new Date().toISOString(),
                                },
                            }
                        )
                        logger.warn(
                            `[RoyalMail] Fulfillment ${fulfillment.fulfillmentId} — RM order ${fulfillment.rmOrderIdentifier} no longer exists at Click & Drop; flagged terminal, polling stops`
                        )
                    } catch (flagError: any) {
                        logger.error(
                            `[RoyalMail] Failed to flag terminal fulfillment ${fulfillment.fulfillmentId}: ${flagError.message}`
                        )
                    }
                    continue
                }

                // Non-fatal per fulfillment — log and continue to the next one
                logger.error(
                    `[RoyalMail] Error processing fulfillment ${fulfillment.fulfillmentId}: ${msg}`
                )
            }
        }

        return new StepResponse({
            processed: input.fulfillments.length,
            prepared,
            shipped,
        })
    }
)