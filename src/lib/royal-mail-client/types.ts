export const ROYAL_MAIL_API_URL = "https://api.parcel.royalmail.com/api/v1"

export type RoyalMailClientOptions = {
    apiKey: string
}

export type RoyalMailOrder = {
    orderReference?: string
    orderDate: string
    subtotal: number
    shippingCostCharged: number
    otherCost?: number
    total: number
    currencyCode?: string
    recipient: RoyalMailRecipient
    packages: RoyalMailPackage[]
}

export type RoyalMailRecipient = {
    address: {
        fullName: string
        addressLine1: string
        addressLine2?: string
        addressLine3?: string
        city: string
        county?: string
        postcode: string
        countryCode: string
    }
    emailAddress?: string
    phoneNumber?: string
}

export type RoyalMailPackage = {
    weightInGrams?: number
    packageWeight?: number
    packageFormatIdentifier?: string
    contents: RoyalMailItem[]
}

export type RoyalMailItem = {
    name: string
    SKU?: string
    quantity: number
    unitValue: number
    unitWeightInGrams?: number
}

export type RoyalMailOrderResponse = {
    createdOrders?: Array<{
        orderIdentifier: number
        orderReference: string
        createdOn?: string
        orderDate?: string
        packages?: Array<{ packageNumber: number }>
        labelErrors?: unknown[]
        generatedDocuments?: unknown[]
    }>
    orders?: Array<{
        orderIdentifier: number
        orderNumber: string
    }>
    successCount?: number
    errorsCount?: number
    failedOrders?: Array<{
        errors: Array<{
            errorCode: number
            errorMessage: string
        }>
    }>
}

export type RoyalMailOrderDetails = RoyalMailOrder & {
    orderIdentifier: string
    status: string
    trackingNumber?: string
    trackingUrl?: string
}
// See Royal Mail API Docs: https://api.parcel.royalmail.com