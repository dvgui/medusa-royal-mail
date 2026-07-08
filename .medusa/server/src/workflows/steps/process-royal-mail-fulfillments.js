"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processRoyalMailFulfillmentsStep = exports.ROYAL_MAIL_ORDER_PREPARED_EVENT = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const utils_1 = require("@medusajs/framework/utils");
const client_1 = require("../../lib/royal-mail-client/client");
const core_flows_1 = require("@medusajs/medusa/core-flows");
/**
 * Emitted when Royal Mail has printed the label and allocated a tracking
 * number, but the parcel has NOT yet been despatched. peptide-admin's
 * `order-prepared` subscriber mirrors this literal (cross-repo — keep in sync)
 * and sends the "your order is packed and ready" email.
 */
exports.ROYAL_MAIL_ORDER_PREPARED_EVENT = "royal_mail.order_prepared";
/**
 * Loops over all pending fulfillments, checks each one against the RM API,
 * and creates a Medusa shipment for any that are Despatched.
 */
exports.processRoyalMailFulfillmentsStep = (0, workflows_sdk_1.createStep)("process-royal-mail-fulfillments", async (input, { container }) => {
    const logger = container.resolve("logger");
    const apiKey = process.env.ROYAL_MAIL_API_KEY;
    if (!apiKey) {
        throw new Error("ROYAL_MAIL_API_KEY environment variable is not set");
    }
    const client = new client_1.RoyalMailClient({ apiKey }, logger);
    const eventBus = container.resolve(utils_1.Modules.EVENT_BUS);
    const fulfillmentModule = container.resolve(utils_1.Modules.FULFILLMENT);
    let prepared = 0;
    let shipped = 0;
    for (const fulfillment of input.fulfillments) {
        try {
            const order = await client.getOrder(fulfillment.rmOrderIdentifier);
            if (!order) {
                logger.info(`[RoyalMail] Fulfillment ${fulfillment.fulfillmentId} — RM order ${fulfillment.rmOrderIdentifier} not found, skipping`);
                continue;
            }
            const trackingNumber = order.trackingNumber ?? "";
            // STAGE 1 — label printed & tracking allocated, not yet
            // despatched. Notify the customer their order is prepared
            // exactly once, WITHOUT marking it shipped (it stays in the
            // poll until RM reports despatch). When the tracking number and
            // despatch surface together, the `!order.shippedOn` guard is
            // already false, so this is skipped and only the shipped email
            // fires — no spurious "prepared" note.
            if (trackingNumber &&
                !order.shippedOn &&
                !fulfillment.preparedNotifiedAt) {
                await eventBus.emit({
                    name: exports.ROYAL_MAIL_ORDER_PREPARED_EVENT,
                    data: {
                        id: fulfillment.fulfillmentId,
                        tracking_number: trackingNumber,
                    },
                });
                const existing = await fulfillmentModule.retrieveFulfillment(fulfillment.fulfillmentId);
                await fulfillmentModule.updateFulfillment(fulfillment.fulfillmentId, {
                    data: {
                        ...(existing.data ??
                            {}),
                        rmPreparedNotifiedAt: new Date().toISOString(),
                    },
                });
                prepared++;
                logger.info(`[RoyalMail] Fulfillment ${fulfillment.fulfillmentId} prepared (label ready) — customer notified. Tracking: ${trackingNumber}`);
            }
            // STAGE 2 — RM reports despatch (shippedOn). Mark the Medusa
            // shipment + fire the shipped email.
            if (!order.shippedOn) {
                logger.info(`[RoyalMail] Fulfillment ${fulfillment.fulfillmentId} not yet despatched — skipping shipment`);
                continue;
            }
            await (0, core_flows_1.createShipmentWorkflow)(container).run({
                input: {
                    id: fulfillment.fulfillmentId,
                    labels: [
                        {
                            tracking_number: trackingNumber,
                            tracking_url: client_1.RoyalMailClient.trackingUrlFor(trackingNumber),
                            label_url: "",
                        },
                    ],
                },
            });
            // createShipmentWorkflow only updates shipped_at; it does NOT
            // emit shipment.created (that event is only emitted by the
            // order-level createOrderShipmentWorkflow the admin UI calls).
            // Emit it manually so downstream subscribers (e.g. the order-
            // shipped email) fire for polled shipments too.
            await eventBus.emit({
                name: utils_1.FulfillmentWorkflowEvents.SHIPMENT_CREATED,
                data: {
                    id: fulfillment.fulfillmentId,
                    no_notification: false,
                },
            });
            shipped++;
            logger.info(`[RoyalMail] Fulfillment ${fulfillment.fulfillmentId} marked as shipped. Tracking: ${trackingNumber}`);
        }
        catch (error) {
            const msg = String(error?.message ?? error);
            // RM 400 "Order with provided id does not exist" is permanent —
            // the Click & Drop order was deleted (merged labels, manual
            // cleanup). Flag the fulfillment so the finder stops polling it.
            if (/Order with provided id does not exist/i.test(msg)) {
                try {
                    const existing = await fulfillmentModule.retrieveFulfillment(fulfillment.fulfillmentId);
                    await fulfillmentModule.updateFulfillment(fulfillment.fulfillmentId, {
                        data: {
                            ...(existing.data ?? {}),
                            rmPollTerminalError: new Date().toISOString(),
                        },
                    });
                    logger.warn(`[RoyalMail] Fulfillment ${fulfillment.fulfillmentId} — RM order ${fulfillment.rmOrderIdentifier} no longer exists at Click & Drop; flagged terminal, polling stops`);
                }
                catch (flagError) {
                    logger.error(`[RoyalMail] Failed to flag terminal fulfillment ${fulfillment.fulfillmentId}: ${flagError.message}`);
                }
                continue;
            }
            // Non-fatal per fulfillment — log and continue to the next one
            logger.error(`[RoyalMail] Error processing fulfillment ${fulfillment.fulfillmentId}: ${msg}`);
        }
    }
    return new workflows_sdk_1.StepResponse({
        processed: input.fulfillments.length,
        prepared,
        shipped,
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy1yb3lhbC1tYWlsLWZ1bGZpbGxtZW50cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy93b3JrZmxvd3Mvc3RlcHMvcHJvY2Vzcy1yb3lhbC1tYWlsLWZ1bGZpbGxtZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFBNEU7QUFNNUUscURBR2tDO0FBQ2xDLCtEQUFvRTtBQUVwRSw0REFBb0U7QUFFcEU7Ozs7O0dBS0c7QUFDVSxRQUFBLCtCQUErQixHQUFHLDJCQUEyQixDQUFBO0FBYTFFOzs7R0FHRztBQUNVLFFBQUEsZ0NBQWdDLEdBQUcsSUFBQSwwQkFBVSxFQUN0RCxpQ0FBaUMsRUFDakMsS0FBSyxFQUNELEtBQXNELEVBQ3RELEVBQUUsU0FBUyxFQUFrQyxFQUNnQixFQUFFO0lBQy9ELE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7SUFFMUMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQTtJQUM3QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDVixNQUFNLElBQUksS0FBSyxDQUFDLG9EQUFvRCxDQUFDLENBQUE7SUFDekUsQ0FBQztJQUVELE1BQU0sTUFBTSxHQUFHLElBQUksd0JBQWUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBRXRELE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQzlCLGVBQU8sQ0FBQyxTQUFTLENBQ3BCLENBQUE7SUFDRCxNQUFNLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQ3ZDLGVBQU8sQ0FBQyxXQUFXLENBQ3RCLENBQUE7SUFFRCxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUE7SUFDaEIsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFBO0lBRWYsS0FBSyxNQUFNLFdBQVcsSUFBSSxLQUFLLENBQUMsWUFBWSxF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