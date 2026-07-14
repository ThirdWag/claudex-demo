import assert from "node:assert/strict";
import { createCustomerHandler } from "../templates/demo-repo/src/customer-handler.js";
import { CustomerService } from "../templates/demo-repo/src/customer-service.js";
import { CustomerStore } from "../templates/demo-repo/src/customer-store.js";

let arrivals = 0;
let release;
const bothRequestsReachedInsert = new Promise((resolve) => {
  release = resolve;
});

const store = new CustomerStore();
const service = new CustomerService(store, {
  beforeInsert: async () => {
    arrivals += 1;
    if (arrivals === 2) release();
    await bothRequestsReachedInsert;
  },
});
const handle = createCustomerHandler(service);
const request = {
  headers: { "idempotency-key": "concurrent-signup" },
  body: { email: "person@example.test" },
};

const [first, second] = await Promise.all([handle(request), handle(request)]);
assert.notEqual(first.body.id, second.body.id);
assert.equal(store.all().length, 2);
