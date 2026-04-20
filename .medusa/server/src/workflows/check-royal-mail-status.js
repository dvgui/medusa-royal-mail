"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRoyalMailStatusWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const core_flows_1 = require("@medusajs/medusa/core-flows");
const check_royal_mail_order_status_1 = require("./steps/check-royal-mail-order-status");
const client_1 = require("../lib/royal-mail-client/client");
exports.checkRoyalMailStatusWorkflow = (0, workflows_sdk_1.createWorkflow)("check-royal-mail-status", function (input) {
    const rmOrder = (0, check_royal_mail_order_status_1.checkRoyalMailOrderStatusStep)({
        rmOrderIdentifier: input.rmOrderIdentifier,
    });
    const result = (0, workflows_sdk_1.when)({ rmOrder }, (data) => {
        return !!data.rmOrder && !!data.rmOrder.shippedOn;
    }).then(() => {
        const shipmentData = (0, workflows_sdk_1.transform)({ input, rmOrder }, (data) => {
            const trackingNumber = data.rmOrder?.trackingNumber ?? "";
            const payload = {
                id: data.input.fulfillmentId,
                labels: [
                    {
                        tracking_number: trackingNumber,
                        tracking_url: client_1.RoyalMailClient.trackingUrlFor(trackingNumber),
                        label_url: "",
                    },
                ],
            };
            return payload;
        });
        return core_flows_1.createShipmentWorkflow.runAsStep({ input: shipmentData });
    });
    const exportedResult = (0, workflows_sdk_1.transform)({ result }, (data) => {
        const output = {
            success: !!data.result,
        };
        return output;
    });
    return new workflows_sdk_1.WorkflowResponse(exportedResult);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2stcm95YWwtbWFpbC1zdGF0dXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvd29ya2Zsb3dzL2NoZWNrLXJveWFsLW1haWwtc3RhdHVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFFQUswQztBQUMxQyw0REFBb0U7QUFDcEUseUZBQXFGO0FBQ3JGLDREQUFpRTtBQW9CcEQsUUFBQSw0QkFBNEIsR0FBRyxJQUFBLDhCQUFjLEVBQ3RELHlCQUF5QixFQUN6QixVQUNJLEtBQXdDO0lBRXhDLE1BQU0sT0FBTyxHQUFHLElBQUEsNkRBQTZCLEVBQUM7UUFDMUMsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLGlCQUFpQjtLQUM3QyxDQUFDLENBQUE7SUFFRixNQUFNLE1BQU0sR0FBRyxJQUFBLG9CQUFJLEVBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ3RDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFBO0lBQ3JELENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDVCxNQUFNLFlBQVksR0FBRyxJQUFBLHlCQUFTLEVBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUN4RCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLGNBQWMsSUFBSSxFQUFFLENBQUE7WUFDekQsTUFBTSxPQUFPLEdBQWdDO2dCQUN6QyxFQUFFLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhO2dCQUM1QixNQUFNLEVBQUU7b0JBQ0o7d0JBQ0ksZUFBZSxFQUFFLGNBQWM7d0JBQy9CLFlBQVksRUFBRSx3QkFBZSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUM7d0JBQzVELFNBQVMsRUFBRSxFQUFFO3FCQUNoQjtpQkFDSjthQUNKLENBQUE7WUFDRCxPQUFPLE9BQU8sQ0FBQTtRQUNsQixDQUFDLENBQUMsQ0FBQTtRQUVGLE9BQU8sbUNBQXNCLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUE7SUFDcEUsQ0FBQyxDQUFDLENBQUE7SUFFRixNQUFNLGNBQWMsR0FBRyxJQUFBLHlCQUFTLEVBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ2xELE1BQU0sTUFBTSxHQUF1QztZQUMvQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNO1NBQ3pCLENBQUE7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNqQixDQUFDLENBQUMsQ0FBQTtJQUVGLE9BQU8sSUFBSSxnQ0FBZ0IsQ0FBQyxjQUFjLENBQUMsQ0FBQTtBQUMvQyxDQUFDLENBQ0osQ0FBQSJ9