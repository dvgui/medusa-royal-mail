import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MedusaContainer } from "@medusajs/framework/types"

export interface PendingRoyalMailFulfillment {
    fulfillmentId: string
    rmOrderIdentifier: string
}

/**
 * Queries for fulfillments that have been submitted to Royal Mail
 * (fulfillment.data.rmOrderId is set by the provider) but not yet shipped.
 *
 * The provider stores the RM identifier in CreateFulfillmentResult.data:
 *   { data: { rmOrderId: response.orders[0].orderIdentifier } }
 * Medusa persists this on fulfillment.data — NOT fulfillment.metadata.
 */
export const findPendingRoyalMailFulfillmentsStep = createStep(
    "find-pending-royal-mail-fulfillments",
    async (
        _input: Record<string, never>,
        { container }: { container: MedusaContainer }
    ): Promise<StepResponse<PendingRoyalMailFulfillment[]>> => {
        const query = container.resolve(ContainerRegistrationKeys.QUERY)

        const { data: fulfillments } = await query.graph({
            entity: "fulfillment",
            fields: ["id", "shipped_at", "data"],
            filters: {
                shipped_at: null,
            },
        })

        const pending: PendingRoyalMailFulfillment[] = fulfillments
            .filter(
                (f) =>
                    f.data &&
                    typeof f.data === "object" &&
                    typeof (f.data as Record<string, unknown>).rmOrderId === "string"
            )
            .map((f) => ({
                fulfillmentId: f.id,
                rmOrderIdentifier: (f.data as Record<string, string>).rmOrderId,
            }))

        console.log(
            `[RoyalMail] Found ${pending.length} fulfillment(s) pending despatch confirmation`
        )

        return new StepResponse(pending)
    }
)