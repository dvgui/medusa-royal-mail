"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollRoyalMailFulfillmentsWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const find_pending_royal_mail_fulfillments_1 = require("./steps/find-pending-royal-mail-fulfillments");
const process_royal_mail_fulfillments_1 = require("./steps/process-royal-mail-fulfillments");
/**
 * Polling workflow invoked by the scheduled job.
 *
 * Two steps only — Medusa v2 constructor constraints mean:
 *
 * Step 1: Find all unshipped fulfillments that have an RM order ID
 * Step 2: For each one, check RM status and create shipment if Despatched
 */
exports.pollRoyalMailFulfillmentsWorkflow = (0, workflows_sdk_1.createWorkflow)("poll-royal-mail-fulfillments", function () {
    const pendingFulfillments = (0, find_pending_royal_mail_fulfillments_1.findPendingRoyalMailFulfillmentsStep)({});
    const result = (0, process_royal_mail_fulfillments_1.processRoyalMailFulfillmentsStep)({
        fulfillments: pendingFulfillments,
    });
    return new workflows_sdk_1.WorkflowResponse(result);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9sbC1yb3lhbC1tYWlsLWZ1bGZpbGxtZW50cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy93b3JrZmxvd3MvcG9sbC1yb3lhbC1tYWlsLWZ1bGZpbGxtZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFHMEM7QUFDMUMsdUdBQW1HO0FBQ25HLDZGQUEwRjtBQUcxRjs7Ozs7OztHQU9HO0FBQ1UsUUFBQSxpQ0FBaUMsR0FBRyxJQUFBLDhCQUFjLEVBQzNELDhCQUE4QixFQUM5QjtJQUNJLE1BQU0sbUJBQW1CLEdBQUcsSUFBQSwyRUFBb0MsRUFBQyxFQUFFLENBQUMsQ0FBQTtJQUVwRSxNQUFNLE1BQU0sR0FBRyxJQUFBLGtFQUFnQyxFQUFDO1FBQzVDLFlBQVksRUFBRSxtQkFBbUI7S0FDcEMsQ0FBQyxDQUFBO0lBRUYsT0FBTyxJQUFJLGdDQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQ3ZDLENBQUMsQ0FDSixDQUFBIn0=