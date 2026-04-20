"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processRoyalMailFulfillmentsStep = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
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
            const trackingUrl = trackingNumber
                ? `https://www.royalmail.com/track-your-item#/tracking-results/${trackingNumber}`
                : "";
            await (0, core_flows_1.createShipmentWorkflow)(container).run({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy1yb3lhbC1tYWlsLWZ1bGZpbGxtZW50cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy93b3JrZmxvd3Mvc3RlcHMvcHJvY2Vzcy1yb3lhbC1tYWlsLWZ1bGZpbGxtZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFBNEU7QUFFNUUsK0RBQW9FO0FBRXBFLDREQUFvRTtBQU9wRTs7O0dBR0c7QUFDVSxRQUFBLGdDQUFnQyxHQUFHLElBQUEsMEJBQVUsRUFDdEQsaUNBQWlDLEVBQ2pDLEtBQUssRUFDRCxLQUFzRCxFQUN0RCxFQUFFLFNBQVMsRUFBa0MsRUFDZ0IsRUFBRTtJQUMvRCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBRTFDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUE7SUFDN0MsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ1YsTUFBTSxJQUFJLEtBQUssQ0FBQyxvREFBb0QsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLHdCQUFlLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUV0RCxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUE7SUFFZixLQUFLLE1BQU0sV0FBVyxJQUFJLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUMzQyxJQUFJLENBQUM7WUFDRCxNQUFNLEtBQUssR0FBRyxNQUFNLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUE7WUFFbEUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNULE1BQU0sQ0FBQyxJQUFJLENBQ1AsMkJBQTJCLFdBQVcsQ0FBQyxhQUFhLGVBQWUsV0FBVyxDQUFDLGlCQUFpQixzQkFBc0IsQ0FDekgsQ0FBQTtnQkFDRCxTQUFRO1lBQ1osQ0FBQztZQUVELElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ25CLE1BQU0sQ0FBQyxJQUFJLENBQ1AsMkJBQTJCLFdBQVcsQ0FBQyxhQUFhLGdDQUFnQyxDQUN2RixDQUFBO2dCQUNELFNBQVE7WUFDWixDQUFDO1lBRUQsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLGNBQWMsSUFBSSxFQUFFLENBQUE7WUFDakQsTUFBTSxXQUFXLEdBQUcsY0FBYztnQkFDOUIsQ0FBQyxDQUFDLCtEQUErRCxjQUFjLEVBQUU7Z0JBQ2pGLENBQUMsQ0FBQyxFQUFFLENBQUE7WUFFUixNQUFNLElBQUEsbUNBQXNCLEVBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDO2dCQUN4QyxLQUFLLEVBQUU7b0JBQ0gsRUFBRSxFQUFFLFdBQVcsQ0FBQyxhQUFhO29CQUM3QixNQUFNLEVBQUU7d0JBQ0o7NEJBQ0ksZUFBZSxFQUFFLGNBQWM7NEJBQy9CLFlBQVksRUFBRSxXQUFXOzRCQUN6QixTQUFTLEVBQUUsRUFBRTt5QkFDaEI7cUJBQ0o7aUJBQ0o7YUFDSixDQUFDLENBQUE7WUFFRixPQUFPLEVBQUUsQ0FBQTtZQUNULE1BQU0sQ0FBQyxJQUFJLENBQ1AsMkJBQTJCLFdBQVcsQ0FBQyxhQUFhLGlDQUFpQyxjQUFjLEVBQUUsQ0FDeEcsQ0FBQTtRQUNMLENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ2xCLCtEQUErRDtZQUMvRCxNQUFNLENBQUMsS0FBSyxDQUNSLDRDQUE0QyxXQUFXLENBQUMsYUFBYSxLQUFLLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FDNUYsQ0FBQTtRQUNMLENBQUM7SUFDTCxDQUFDO0lBRUQsT0FBTyxJQUFJLDRCQUFZLENBQUM7UUFDcEIsU0FBUyxFQUFFLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTTtRQUNwQyxPQUFPO0tBQ1YsQ0FBQyxDQUFBO0FBQ04sQ0FBQyxDQUNKLENBQUEifQ==