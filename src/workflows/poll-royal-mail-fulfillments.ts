import {
    createWorkflow,
    WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { findPendingRoyalMailFulfillmentsStep } from "./steps/find-pending-royal-mail-fulfillments"
import { processRoyalMailFulfillmentsStep } from "./steps/process-royal-mail-fulfillments"
import { ProcessRoyalMailFulfillmentsStepOutput } from "./steps/process-royal-mail-fulfillments"

/**
 * Polling workflow invoked by the scheduled job.
 *
 * Two steps only — Medusa v2 constructor constraints mean:
 *
 * Step 1: Find all unshipped fulfillments that have an RM order ID
 * Step 2: For each one, check RM status and create shipment if Despatched
 */
export const pollRoyalMailFulfillmentsWorkflow = createWorkflow(
    "poll-royal-mail-fulfillments",
    function (): WorkflowResponse<ProcessRoyalMailFulfillmentsStepOutput> {
        const pendingFulfillments = findPendingRoyalMailFulfillmentsStep({})

        const result = processRoyalMailFulfillmentsStep({
            fulfillments: pendingFulfillments,
        })

        return new WorkflowResponse(result)
    }
)