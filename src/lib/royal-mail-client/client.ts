import { Logger } from "@medusajs/framework/types"
import { RoyalMailClientOptions, RoyalMailOrderResponse, RoyalMailOrder, RoyalMailOrderDetails } from "./types"

export class RoyalMailClient {
    private apiKey_: string
    private logger_: Logger

    constructor(options: RoyalMailClientOptions, logger: Logger) {
        this.apiKey_ = options.apiKey
        this.logger_ = logger
    }

    private async request<T>(
        path: string,
        method: "GET" | "POST" | "PUT" | "DELETE",
        body?: unknown
    ): Promise<T> {
        const url = `https://api.parcel.royalmail.com/api/v1${path}`

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${this.apiKey_}`,
                },
                body: body ? JSON.stringify(body) : undefined,
            })

            if (!response.ok) {
                const errorData = await response.text()
                throw new Error(`Royal Mail API Error: ${response.status} ${response.statusText} - ${errorData}`)
            }

            return (await response.json()) as T
        } catch (error: any) {
            this.logger_.error(`RoyalMailClient request failed: ${error.message}`)
            throw error
        }
    }

    /**
     * Creates orders in Click & Drop
     */
    async createOrders(orders: RoyalMailOrder[]): Promise<RoyalMailOrderResponse> {
        return this.request<RoyalMailOrderResponse>("/orders", "POST", { items: orders })
    }

    /**
     * Gets a label for a specific order. Requires OBA account.
     */
    async getLabel(orderIdentifier: string): Promise<Blob> {
        const url = `https://api.parcel.royalmail.com/api/v1/orders/${orderIdentifier}/label`
        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${this.apiKey_}`,
            },
        })

        if (!response.ok) {
            const errorData = await response.text()
            throw new Error(`Royal Mail API Error fetching label: ${response.status} - ${errorData}`)
        }

        return await response.blob()
    }

    /**
     * Gets order details from Click & Drop. The API returns an array with a
     * single entry; callers get that entry directly, or null if the order
     * isn't found.
     */
    async getOrder(
        orderIdentifier: string
    ): Promise<RoyalMailOrderDetails | null> {
        const response = await this.request<RoyalMailOrderDetails[]>(
            `/orders/${orderIdentifier}`,
            "GET"
        )
        return response?.[0] ?? null
    }

    /**
     * Builds a public tracking URL for a given tracking number. Returns "" if
     * no tracking number is provided.
     */
    static trackingUrlFor(trackingNumber: string | null | undefined): string {
        return trackingNumber
            ? `https://www.royalmail.com/track-your-item#/tracking-results/${trackingNumber}`
            : ""
    }
}
