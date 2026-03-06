"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processRoyalMailFulfillmentsStep = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const client_1 = require("../../lib/royal-mail-client/client");
const core_flows_1 = require("@medusajs/medusa/core-flows");
/**
 * Loops over all pending fulfillments, checks each one against the RM API,
 * and creates a Medusa shipment for any that are Despatched.
 *
 * The loop lives here in a step (not in the workflow constructor) because:
 * - Steps are plain async functions — no Medusa constructor constraints apply
 * - transform() in a workflow constructor must be synchronous
 * - workflow.run() can be called from a step
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
            if (order.status !== "Despatched") {
                logger.info(`[RoyalMail] Fulfillment ${fulfillment.fulfillmentId} status: ${order.status} — skipping`);
                continue;
            }
            // Call createShipmentWorkflow for this fulfillment
            await (0, core_flows_1.createShipmentWorkflow)(container).run({
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
            });
            shipped++;
            logger.info(`[RoyalMail] Fulfillment ${fulfillment.fulfillmentId} marked as shipped. Tracking: ${order.trackingNumber}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy1yb3lhbC1tYWlsLWZ1bGZpbGxtZW50cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy93b3JrZmxvd3Mvc3RlcHMvcHJvY2Vzcy1yb3lhbC1tYWlsLWZ1bGZpbGxtZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFBNEU7QUFFNUUsK0RBQW9FO0FBRXBFLDREQUFvRTtBQU9wRTs7Ozs7Ozs7R0FRRztBQUNVLFFBQUEsZ0NBQWdDLEdBQUcsSUFBQSwwQkFBVSxFQUN0RCxpQ0FBaUMsRUFDakMsS0FBSyxFQUNELEtBQXNELEVBQ3RELEVBQUUsU0FBUyxFQUFrQyxFQUNnQixFQUFFO0lBQy9ELE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7SUFFMUMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQTtJQUM3QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDVixNQUFNLElBQUksS0FBSyxDQUFDLG9EQUFvRCxDQUFDLENBQUE7SUFDekUsQ0FBQztJQUVELE1BQU0sTUFBTSxHQUFHLElBQUksd0JBQWUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBRXRELElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQTtJQUVmLEtBQUssTUFBTSxXQUFXLElBQUksS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQzNDLElBQUksQ0FBQztZQUNELE1BQU0sS0FBSyxHQUFHLE1BQU0sTUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtZQUVsRSxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssWUFBWSxFQUFFLENBQUM7Z0JBQ2hDLE1BQU0sQ0FBQyxJQUFJLENBQ1AsMkJBQTJCLFdBQVcsQ0FBQyxhQUFhLFlBQVksS0FBSyxDQUFDLE1BQU0sYUFBYSxDQUM1RixDQUFBO2dCQUNELFNBQVE7WUFDWixDQUFDO1lBRUQsbURBQW1EO1lBQ25ELE1BQU0sSUFBQSxtQ0FBc0IsRUFBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUM7Z0JBQ3hDLEtBQUssRUFBRTtvQkFDSCxFQUFFLEVBQUUsV0FBVyxDQUFDLGFBQWE7b0JBQzdCLE1BQU0sRUFBRTt3QkFDSjs0QkFDSSxlQUFlLEVBQUUsS0FBSyxDQUFDLGNBQWMsSUFBSSxFQUFFOzRCQUMzQyxZQUFZLEVBQUUsS0FBSyxDQUFDLFdBQVcsSUFBSSxFQUFFOzRCQUNyQyxTQUFTLEVBQUUsRUFBRTt5QkFDaEI7cUJBQ0o7aUJBQ0o7YUFDSixDQUFDLENBQUE7WUFFRixPQUFPLEVBQUUsQ0FBQTtZQUNULE1BQU0sQ0FBQyxJQUFJLENBQ1AsMkJBQTJCLFdBQVcsQ0FBQyxhQUFhLGlDQUFpQyxLQUFLLENBQUMsY0FBYyxFQUFFLENBQzlHLENBQUE7UUFDTCxDQUFDO1FBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztZQUNsQiwrREFBK0Q7WUFDL0QsTUFBTSxDQUFDLEtBQUssQ0FDUiw0Q0FBNEMsV0FBVyxDQUFDLGFBQWEsS0FBSyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQzVGLENBQUE7UUFDTCxDQUFDO0lBQ0wsQ0FBQztJQUVELE9BQU8sSUFBSSw0QkFBWSxDQUFDO1FBQ3BCLFNBQVMsRUFBRSxLQUFLLENBQUMsWUFBWSxDQUFDLE1BQU07UUFDcEMsT0FBTztLQUNWLENBQUMsQ0FBQTtBQUNOLENBQUMsQ0FDSixDQUFBIn0=