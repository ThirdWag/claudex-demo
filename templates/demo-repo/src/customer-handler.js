import { parseCreateCustomerRequest } from "./customer-validation.js";

export function createCustomerHandler(service) {
  return async function handle(request) {
    try {
      const command = parseCreateCustomerRequest(request);
      const customer = await service.create(command);
      return { status: 201, body: customer };
    } catch (error) {
      if (error instanceof TypeError) {
        return { status: 422, body: { error: error.message } };
      }
      throw error;
    }
  };
}
