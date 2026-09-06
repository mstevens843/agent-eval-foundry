# Repair the delegated credit dispatcher

The batch dispatcher processes customer-approved service-credit requests. It has a
working queue, wallet client and local journal, but repeated deliveries and policy
updates can produce inconsistent allocations. Repair the multi-file application.
The fictional integer-credit rules in `SEMANTICS.md` are the full domain contract;
no blockchain integration or external financial knowledge is needed.

Start with `node --test test/*.test.mjs`. Grading runs `subject.run(view, api)` from
`entry.mjs` in fresh processes across delivery batches, retaining `view.storage`.
You may replace the algorithms and persistence format; do not change the contract.
