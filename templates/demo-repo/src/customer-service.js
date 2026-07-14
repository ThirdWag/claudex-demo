export class CustomerService {
  constructor(store, { beforeInsert = async () => {} } = {}) {
    this.store = store;
    this.beforeInsert = beforeInsert;
  }

  async create(command) {
    const existing = this.store.findByIdempotencyKey(command.idempotencyKey);
    if (existing) {
      return existing;
    }

    await this.beforeInsert(command);
    return this.store.insert({
      email: command.email,
      idempotencyKey: command.idempotencyKey,
    });
  }
}
