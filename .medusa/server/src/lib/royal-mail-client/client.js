"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoyalMailClient = void 0;
class RoyalMailClient {
    constructor(options, logger) {
        this.apiKey_ = options.apiKey;
        this.logger_ = logger;
    }
    async request(path, method, body) {
        const url = `https://api.parcel.royalmail.com/api/v1${path}`;
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${this.apiKey_}`,
                },
                body: body ? JSON.stringify(body) : undefined,
            });
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Royal Mail API Error: ${response.status} ${response.statusText} - ${errorData}`);
            }
            return (await response.json());
        }
        catch (error) {
            this.logger_.error(`RoyalMailClient request failed: ${error.message}`);
            throw error;
        }
    }
    /**
     * Creates orders in Click & Drop
     */
    async createOrders(orders) {
        return this.request("/orders", "POST", { items: orders });
    }
    /**
     * Gets a label for a specific order. Requires OBA account.
     */
    async getLabel(orderIdentifier) {
        const url = `https://api.parcel.royalmail.com/api/v1/orders/${orderIdentifier}/label`;
        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${this.apiKey_}`,
            },
        });
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Royal Mail API Error fetching label: ${response.status} - ${errorData}`);
        }
        return await response.blob();
    }
}
exports.RoyalMailClient = RoyalMailClient;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL2xpYi9yb3lhbC1tYWlsLWNsaWVudC9jbGllbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBR0EsTUFBYSxlQUFlO0lBSXhCLFlBQVksT0FBK0IsRUFBRSxNQUFjO1FBQ3ZELElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQTtRQUM3QixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtJQUN6QixDQUFDO0lBRU8sS0FBSyxDQUFDLE9BQU8sQ0FDakIsSUFBWSxFQUNaLE1BQXlDLEVBQ3pDLElBQWM7UUFFZCxNQUFNLEdBQUcsR0FBRywwQ0FBMEMsSUFBSSxFQUFFLENBQUE7UUFFNUQsSUFBSSxDQUFDO1lBQ0QsTUFBTSxRQUFRLEdBQUcsTUFBTSxLQUFLLENBQUMsR0FBRyxFQUFFO2dCQUM5QixNQUFNO2dCQUNOLE9BQU8sRUFBRTtvQkFDTCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyxNQUFNLEVBQUUsa0JBQWtCO29CQUMxQixhQUFhLEVBQUUsVUFBVSxJQUFJLENBQUMsT0FBTyxFQUFFO2lCQUMxQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO2FBQ2hELENBQUMsQ0FBQTtZQUVGLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ2YsTUFBTSxTQUFTLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLFFBQVEsQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLFVBQVUsTUFBTSxTQUFTLEVBQUUsQ0FBQyxDQUFBO1lBQ3JHLENBQUM7WUFFRCxPQUFPLENBQUMsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQU0sQ0FBQTtRQUN2QyxDQUFDO1FBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7WUFDdEUsTUFBTSxLQUFLLENBQUE7UUFDZixDQUFDO0lBQ0wsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUF3QjtRQUN2QyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQXlCLFNBQVMsRUFBRSxNQUFNLEVBQUUsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtJQUNyRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsUUFBUSxDQUFDLGVBQXVCO1FBQ2xDLE1BQU0sR0FBRyxHQUFHLGtEQUFrRCxlQUFlLFFBQVEsQ0FBQTtRQUNyRixNQUFNLFFBQVEsR0FBRyxNQUFNLEtBQUssQ0FBQyxHQUFHLEVBQUU7WUFDOUIsTUFBTSxFQUFFLEtBQUs7WUFDYixPQUFPLEVBQUU7Z0JBQ0wsYUFBYSxFQUFFLFVBQVUsSUFBSSxDQUFDLE9BQU8sRUFBRTthQUMxQztTQUNKLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZixNQUFNLFNBQVMsR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUN2QyxNQUFNLElBQUksS0FBSyxDQUFDLHdDQUF3QyxRQUFRLENBQUMsTUFBTSxNQUFNLFNBQVMsRUFBRSxDQUFDLENBQUE7UUFDN0YsQ0FBQztRQUVELE9BQU8sTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDaEMsQ0FBQztDQUNKO0FBakVELDBDQWlFQyJ9