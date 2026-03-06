import { ModuleProvider, Modules, Module } from "@medusajs/framework/utils"
import { RoyalMailProviderService } from "./service"

export const ROYAL_MAIL_MODULE = "royal-mail"

// Needed for plugins array registration — enables job/workflow scanning
export default Module(ROYAL_MAIL_MODULE, {
    service: RoyalMailProviderService,
})

// Needed for fulfillment provider registration
export const provider = ModuleProvider(Modules.FULFILLMENT, {
    services: [RoyalMailProviderService],
})