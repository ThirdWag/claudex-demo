export class CustomerStore {
  #customers = [];
  #nextId = 1;

  findByIdempotencyKey(idempotencyKey) {
    return this.#customers.find(
      (customer) => customer.idempotencyKey === idempotencyKey,
    );
  }

  insert(customer) {
    const saved = { id: this.#nextId++, ...customer };
    this.#customers.push(saved);
    return saved;
  }

  all() {
    return this.#customers.map((customer) => ({ ...customer }));
  }
}
