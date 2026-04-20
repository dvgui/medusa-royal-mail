"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRoyalMailStatusWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const core_flows_1 = require("@medusajs/medusa/core-flows");
const check_royal_mail_order_status_1 = require("./steps/check-royal-mail-order-status");
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
                        tracking_url: trackingNumber
                            ? `https://www.royalmail.com/track-your-item#/tracking-results/${trackingNumber}`
                            : "",
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2stcm95YWwtbWFpbC1zdGF0dXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvd29ya2Zsb3dzL2NoZWNrLXJveWFsLW1haWwtc3RhdHVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFFQUswQztBQUMxQyw0REFBb0U7QUFDcEUseUZBQXFGO0FBb0J4RSxRQUFBLDRCQUE0QixHQUFHLElBQUEsOEJBQWMsRUFDdEQseUJBQXlCLEVBQ3pCLFVBQ0ksS0FBd0M7SUFFeEMsTUFBTSxPQUFPLEdBQUcsSUFBQSw2REFBNkIsRUFBQztRQUMxQyxpQkFBaUIsRUFBRSxLQUFLLENBQUMsaUJBQWlCO0tBQzdDLENBQUMsQ0FBQTtJQUVGLE1BQU0sTUFBTSxHQUFHLElBQUEsb0JBQUksRUFBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDdEMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUE7SUFDckQsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNULE1BQU0sWUFBWSxHQUFHLElBQUEseUJBQVMsRUFBQyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3hELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsY0FBYyxJQUFJLEVBQUUsQ0FBQTtZQUN6RCxNQUFNLE9BQU8sR0FBZ0M7Z0JBQ3pDLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWE7Z0JBQzVCLE1BQU0sRUFBRTtvQkFDSjt3QkFDSSxlQUFlLEVBQUUsY0FBYzt3QkFDL0IsWUFBWSxFQUFFLGNBQWM7NEJBQ3hCLENBQUMsQ0FBQywrREFBK0QsY0FBYyxFQUFFOzRCQUNqRixDQUFDLENBQUMsRUFBRTt3QkFDUixTQUFTLEVBQUUsRUFBRTtxQkFDaEI7aUJBQ0o7YUFDSixDQUFBO1lBQ0QsT0FBTyxPQUFPLENBQUE7UUFDbEIsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPLG1DQUFzQixDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFBO0lBQ3BFLENBQUMsQ0FBQyxDQUFBO0lBRUYsTUFBTSxjQUFjLEdBQUcsSUFBQSx5QkFBUyxFQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUNsRCxNQUFNLE1BQU0sR0FBdUM7WUFDL0MsT0FBTyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTTtTQUN6QixDQUFBO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDakIsQ0FBQyxDQUFDLENBQUE7SUFFRixPQUFPLElBQUksZ0NBQWdCLENBQUMsY0FBYyxDQUFDLENBQUE7QUFDL0MsQ0FBQyxDQUNKLENBQUEifQ==