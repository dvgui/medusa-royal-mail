"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.provider = exports.ROYAL_MAIL_MODULE = void 0;
const utils_1 = require("@medusajs/framework/utils");
const service_1 = require("./service");
exports.ROYAL_MAIL_MODULE = "royal_mail";
exports.default = (0, utils_1.Module)(exports.ROYAL_MAIL_MODULE, {
    service: service_1.RoyalMailProviderService,
});
exports.provider = (0, utils_1.ModuleProvider)(utils_1.Modules.FULFILLMENT, {
    services: [service_1.RoyalMailProviderService],
});
// Added to fix known issue with plugin loading: https://github.com/medusajs/medusa/issues/11205
module.exports.default = {
    ...module.exports.default,
    services: [service_1.RoyalMailProviderService],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9yb3lhbC1tYWlsL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFEQUEyRTtBQUMzRSx1Q0FBb0Q7QUFFdkMsUUFBQSxpQkFBaUIsR0FBRyxZQUFZLENBQUE7QUFFN0Msa0JBQWUsSUFBQSxjQUFNLEVBQUMseUJBQWlCLEVBQUU7SUFDckMsT0FBTyxFQUFFLGtDQUF3QjtDQUNwQyxDQUFDLENBQUE7QUFFVyxRQUFBLFFBQVEsR0FBRyxJQUFBLHNCQUFjLEVBQUMsZUFBTyxDQUFDLFdBQVcsRUFBRTtJQUN4RCxRQUFRLEVBQUUsQ0FBQyxrQ0FBd0IsQ0FBQztDQUN2QyxDQUFDLENBQUE7QUFFRixnR0FBZ0c7QUFDaEcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEdBQUc7SUFDckIsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU87SUFDekIsUUFBUSxFQUFFLENBQUMsa0NBQXdCLENBQUM7Q0FDdkMsQ0FBQSJ9