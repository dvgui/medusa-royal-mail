import { ModuleProvider, Modules, Module } from "@medusajs/framework/utils"
import { RoyalMailProviderService } from "./service"

export const ROYAL_MAIL_MODULE = "royal-mail"

export default Module(ROYAL_MAIL_MODULE, {
    service: RoyalMailProviderService,
})

export const provider = ModuleProvider(Modules.FULFILLMENT, {
    services: [RoyalMailProviderService],
})

// Added to fix known issue with plugin loading: https://github.com/medusajs/medusa/issues/11205
module.exports.default = {
    ...module.exports.default,
    services: [RoyalMailProviderService],
}