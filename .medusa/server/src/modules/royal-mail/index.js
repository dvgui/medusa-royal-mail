"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.provider = exports.ROYAL_MAIL_MODULE = void 0;
const utils_1 = require("@medusajs/framework/utils");
const service_1 = require("./service");
exports.ROYAL_MAIL_MODULE = "royal-mail";
// Needed for plugins array registration — enables job/workflow scanning
exports.default = (0, utils_1.Module)(exports.ROYAL_MAIL_MODULE, {
    service: service_1.RoyalMailProviderService,
});
exports.provider = (0, utils_1.ModuleProvider)(utils_1.Modules.FULFILLMENT, {
    services: [service_1.RoyalMailProviderService],
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9yb3lhbC1tYWlsL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFEQUEyRTtBQUMzRSx1Q0FBb0Q7QUFFdkMsUUFBQSxpQkFBaUIsR0FBRyxZQUFZLENBQUE7QUFFN0Msd0VBQXdFO0FBQ3hFLGtCQUFlLElBQUEsY0FBTSxFQUFDLHlCQUFpQixFQUFFO0lBQ3JDLE9BQU8sRUFBRSxrQ0FBd0I7Q0FDcEMsQ0FBQyxDQUFBO0FBRVcsUUFBQSxRQUFRLEdBQUcsSUFBQSxzQkFBYyxFQUFDLGVBQU8sQ0FBQyxXQUFXLEVBQUU7SUFDeEQsUUFBUSxFQUFFLENBQUMsa0NBQXdCLENBQUM7Q0FDdkMsQ0FBQyxDQUFBIn0=