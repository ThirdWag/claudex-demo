# Duplicate customer incident

Two equivalent customer-creation requests occasionally create two customer rows when they arrive at nearly the same time with the same idempotency key.

Observed behavior:

- both requests return a successful response;
- each response may contain a different customer ID;
- the database then contains two customers for one logical operation;
- sequential retries behave correctly;
- invalid requests continue to return a validation error.

Investigate the request handler, service, validation, and persistence layers. Add a regression test that reproduces the concurrent behavior before implementing the smallest robust fix.
