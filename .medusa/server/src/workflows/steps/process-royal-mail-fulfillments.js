"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processRoyalMailFulfillmentsStep = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const utils_1 = require("@medusajs/framework/utils");
const client_1 = require("../../lib/royal-mail-client/client");
const core_flows_1 = require("@medusajs/medusa/core-flows");
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
    let shipped = 0;
    for (const fulfillment of input.fulfillments) {
        try {
            const order = await client.getOrder(fulfillment.rmOrderIdentifier);
            if (!order) {
                logger.info(`[RoyalMail] Fulfillment ${fulfillment.fulfillmentId} — RM order ${fulfillment.rmOrderIdentifier} not found, skipping`);
                continue;
            }
            if (!order.shippedOn) {
                logger.info(`[RoyalMail] Fulfillment ${fulfillment.fulfillmentId} not yet despatched — skipping`);
                continue;
            }
            const trackingNumber = order.trackingNumber ?? "";
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
            // Non-fatal per fulfillment — log and continue to the next one
            logger.error(`[RoyalMail] Error processing fulfillment ${fulfillment.fulfillmentId}: ${error.message}`);
        }
    }
    return new workflows_sdk_1.StepResponse({
        processed: input.fulfillments.length,
        shipped,
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy1yb3lhbC1tYWlsLWZ1bGZpbGxtZW50cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy93b3JrZmxvd3Mvc3RlcHMvcHJvY2Vzcy1yb3lhbC1tYWlsLWZ1bGZpbGxtZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFBNEU7QUFLNUUscURBR2tDO0FBQ2xDLCtEQUFvRTtBQUVwRSw0REFBb0U7QUFPcEU7OztHQUdHO0FBQ1UsUUFBQSxnQ0FBZ0MsR0FBRyxJQUFBLDBCQUFVLEVBQ3RELGlDQUFpQyxFQUNqQyxLQUFLLEVBQ0QsS0FBc0QsRUFDdEQsRUFBRSxTQUFTLEVBQWtDLEVBQ2dCLEVBQUU7SUFDL0QsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUUxQyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFBO0lBQzdDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNWLE1BQU0sSUFBSSxLQUFLLENBQUMsb0RBQW9ELENBQUMsQ0FBQTtJQUN6RSxDQUFDO0lBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSx3QkFBZSxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFFdEQsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FDOUIsZUFBTyxDQUFDLFNBQVMsQ0FDcEIsQ0FBQTtJQUVELElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQTtJQUVmLEtBQUssTUFBTSxXQUFXLElBQUksS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQzNDLElBQUksQ0FBQztZQUNELE1BQU0sS0FBSyxHQUFHLE1BQU0sTUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtZQUVsRSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ1QsTUFBTSxDQUFDLElBQUksQ0FDUCwyQkFBMkIsV0FBVyxDQUFDLGFBQWEsZUFBZSxXQUFXLENBQUMsaUJBQWlCLHNCQUFzQixDQUN6SCxDQUFBO2dCQUNELFNBQVE7WUFDWixDQUFDO1lBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDbkIsTUFBTSxDQUFDLElBQUksQ0FDUCwyQkFBMkIsV0FBVyxDQUFDLGFBQWEsZ0NBQWdDLENBQ3ZGLENBQUE7Z0JBQ0QsU0FBUTtZQUNaLENBQUM7WUFFRCxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsY0FBYyxJQUFJLEVBQUUsQ0FBQTtZQUVqRCxNQUFNLElBQUEsbUNBQXNCLEVBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDO2dCQUN4QyxLQUFLLEVBQUU7b0JBQ0gsRUFBRSxFQUFFLFdBQVcsQ0FBQyxhQUFhO29CQUM3QixNQUFNLEVBQUU7d0JBQ0o7NEJBQ0ksZUFBZSxFQUFFLGNBQWM7NEJBQy9CLFlBQVksRUFBRSx3QkFBZSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUM7NEJBQzVELFNBQVMsRUFBRSxFQUFFO3lCQUNoQjtxQkFDSjtpQkFDSjthQUNKLENBQUMsQ0FBQTtZQUVGLDhEQUE4RDtZQUM5RCwyREFBMkQ7WUFDM0QsK0RBQStEO1lBQy9ELDhEQUE4RDtZQUM5RCxnREFBZ0Q7WUFDaEQsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDO2dCQUNoQixJQUFJLEVBQUUsaUNBQXlCLENBQUMsZ0JBQWdCO2dCQUNoRCxJQUFJLEVBQUU7b0JBQ0YsRUFBRSxFQUFFLFdBQVcsQ0FBQyxhQUFhO29CQUM3QixlQUFlLEVBQUUsS0FBSztpQkFDekI7YUFDSixDQUFDLENBQUE7WUFFRixPQUFPLEVBQUUsQ0FBQTtZQUNULE1BQU0sQ0FBQyxJQUFJLENBQ1AsMkJBQTJCLFdBQVcsQ0FBQyxhQUFhLGlDQUFpQyxjQUFjLEVBQUUsQ0FDeEcsQ0FBQTtRQUNMLENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ2xCLCtEQUErRDtZQUMvRCxNQUFNLENBQUMsS0FBSyxDQUNSLDRDQUE0QyxXQUFXLENBQUMsYUFBYSxLQUFLLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FDNUYsQ0FBQTtRQUNMLENBQUM7SUFDTCxDQUFDO0lBRUQsT0FBTyxJQUFJLDRCQUFZLENBQUM7UUFDcEIsU0FBUyxFQUFFLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTTtRQUNwQyxPQUFPO0tBQ1YsQ0FBQyxDQUFBO0FBQ04sQ0FBQyxDQUNKLENBQUEifQ==