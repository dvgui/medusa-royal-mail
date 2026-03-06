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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy1yb3lhbC1tYWlsLWZ1bGZpbGxtZW50cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy93b3JrZmxvd3Mvc3RlcHMvcHJvY2Vzcy1yb3lhbC1tYWlsLWZ1bGZpbGxtZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFBNEU7QUFFNUUsK0RBQW9FO0FBRXBFLDREQUFvRTtBQU9wRTs7O0dBR0c7QUFDVSxRQUFBLGdDQUFnQyxHQUFHLElBQUEsMEJBQVUsRUFDdEQsaUNBQWlDLEVBQ2pDLEtBQUssRUFDRCxLQUFzRCxFQUN0RCxFQUFFLFNBQVMsRUFBa0MsRUFDZ0IsRUFBRTtJQUMvRCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBRTFDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUE7SUFDN0MsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ1YsTUFBTSxJQUFJLEtBQUssQ0FBQyxvREFBb0QsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLHdCQUFlLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUV0RCxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUE7SUFFZixLQUFLLE1BQU0sV0FBVyxJQUFJLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUMzQyxJQUFJLENBQUM7WUFDRCxNQUFNLEtBQUssR0FBRyxNQUFNLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUE7WUFFbEUsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLFlBQVksRUFBRSxDQUFDO2dCQUNoQyxNQUFNLENBQUMsSUFBSSxDQUNQLDJCQUEyQixXQUFXLENBQUMsYUFBYSxZQUFZLEtBQUssQ0FBQyxNQUFNLGFBQWEsQ0FDNUYsQ0FBQTtnQkFDRCxTQUFRO1lBQ1osQ0FBQztZQUVELG1EQUFtRDtZQUNuRCxNQUFNLElBQUEsbUNBQXNCLEVBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDO2dCQUN4QyxLQUFLLEVBQUU7b0JBQ0gsRUFBRSxFQUFFLFdBQVcsQ0FBQyxhQUFhO29CQUM3QixNQUFNLEVBQUU7d0JBQ0o7NEJBQ0ksZUFBZSxFQUFFLEtBQUssQ0FBQyxjQUFjLElBQUksRUFBRTs0QkFDM0MsWUFBWSxFQUFFLEtBQUssQ0FBQyxXQUFXLElBQUksRUFBRTs0QkFDckMsU0FBUyxFQUFFLEVBQUU7eUJBQ2hCO3FCQUNKO2lCQUNKO2FBQ0osQ0FBQyxDQUFBO1lBRUYsT0FBTyxFQUFFLENBQUE7WUFDVCxNQUFNLENBQUMsSUFBSSxDQUNQLDJCQUEyQixXQUFXLENBQUMsYUFBYSxpQ0FBaUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUM5RyxDQUFBO1FBQ0wsQ0FBQztRQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7WUFDbEIsK0RBQStEO1lBQy9ELE1BQU0sQ0FBQyxLQUFLLENBQ1IsNENBQTRDLFdBQVcsQ0FBQyxhQUFhLEtBQUssS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUM1RixDQUFBO1FBQ0wsQ0FBQztJQUNMLENBQUM7SUFFRCxPQUFPLElBQUksNEJBQVksQ0FBQztRQUNwQixTQUFTLEVBQUUsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNO1FBQ3BDLE9BQU87S0FDVixDQUFDLENBQUE7QUFDTixDQUFDLENBQ0osQ0FBQSJ9