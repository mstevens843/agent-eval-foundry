# Contract

- Each record has `key` (a nonempty string of at most 64 characters), `revision`
  (an integer from 0 to 1,000,000), and `value` (a string of at most 256 characters).
- Inputs contain at most 100 records, in any order. The same key/revision can repeat only with the same value.
- Every string key is valid, including `__proto__` and `constructor`.
- Publish exactly once, including for empty input. `rows` must be an array of objects
  containing exactly `key`, `revision` and `value`. Publish one row for every distinct input key and no other rows.
- Each published row must have that key's greatest input revision and its associated value.
- Output row order is unrestricted. Input order does not determine which revision is latest.

The independent grader checks `completion` (one publication), `key_scope` (exactly
one row per requested key), and `latest_value` (each published row matches that key's
latest record). These obligations apply to every input satisfying this contract.

Each service invocation has a 45-second limit and a maximum of 4000 API operations.
These are execution limits, separate from the agent's time budget for writing the repair.
