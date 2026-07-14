import { describe, expect, test } from "bun:test";
import { createCustomerHandler } from "../src/customer-handler.js";
import { CustomerService } from "../src/customer-service.js";
import { CustomerStore } from "../src/customer-store.js";

function buildSystem(options) {
  const store = new CustomerStore();
  const service = new CustomerService(store, options);
  return { store, handle: createCustomerHandler(service) };
}

const validRequest = {
  headers: { "idempotency-key": "signup-42" },
  body: { email: "Person@Example.com" },
};

describe("create customer handler", () => {
  test("creates a normalized customer", async () => {
    const { handle, store } = buildSystem();

    const response = await handle(validRequest);

    expect(response.status).toBe(201);
    expect(response.body.email).toBe("person@example.com");
    expect(store.all()).toHaveLength(1);
  });

  test("returns the existing customer for a sequential retry", async () => {
    const { handle, store } = buildSystem();

    const first = await handle(validRequest);
    const retry = await handle(validRequest);

    expect(retry.body.id).toBe(first.body.id);
    expect(store.all()).toHaveLength(1);
  });

  test("rejects an invalid request without persisting a customer", async () => {
    const { handle, store } = buildSystem();

    const response = await handle({ headers: {}, body: { email: "bad" } });

    expect(response).toEqual({
      status: 422,
      body: { error: "email must be valid" },
    });
    expect(store.all()).toEqual([]);
  });
});
