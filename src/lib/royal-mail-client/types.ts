export const ROYAL_MAIL_API_URL = "https://api.parcel.royalmail.com/api/v1"

export type RoyalMailClientOptions = {
    apiKey: string
}

export type RoyalMailOrder = {
    orderIdentifier: string
    // other fields omitted for brevity
}

export type RoyalMailOrderResponse = {
    orders?: RoyalMailOrder[]
    successCount?: number
    errorsCount?: number
    failedOrders?: Array<{
        errors: Array<{
            errorCode: number
            errorMessage: string
        }>
    }>
}

// See Royal Mail API Docs: https://api.parcel.royalmail.com
