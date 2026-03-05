import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { RoyalMailProviderService } from "./service"

export default ModuleProvider(Modules.FULFILLMENT, {
    services: [RoyalMailProviderService],
})
