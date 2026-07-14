export function parseCreateCustomerRequest(request) {
  const email = request?.body?.email?.trim().toLowerCase();
  const idempotencyKey = request?.headers?.["idempotency-key"]?.trim();

  if (!email || !email.includes("@")) {
    throw new TypeError("email must be valid");
  }
  if (!idempotencyKey) {
    throw new TypeError("idempotency-key header is required");
  }

  return { email, idempotencyKey };
}
