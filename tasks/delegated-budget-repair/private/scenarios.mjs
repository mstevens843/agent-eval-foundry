// Real mid-job process death: `crashAfterDebit: N` kills the subject's process after its Nth
// `api.debit` call has already landed server-side (the credits are committed and a receipt
// exists), before it can see any response at all -- not even UNKNOWN, unlike the `unknown` field
// above, which only ever simulates a *response*-level glitch inside a single still-alive process.
// The job is then redelivered identically against the same storage (the real-world response to an
// unconfirmed attempt): a subject that blindly redebits on redelivery double-charges the budget
// (the pre-existing `aggregate_budget`/`receipt_history` checks catch that); a subject whose own
// redelivered eligibility check double-counts the now-already-committed spend against the very
// request that committed it, and gives up instead of consulting `api.lookup`, wrongly abandons
// already-executed, still-authorized work (the pre-existing `completion`/`decisions` checks catch
// that). No new check dimension is needed -- these checks were simply never exercised against a
// real interruption before.
function crashCases() {
  const wallet = (limit) => ({
    id: "w",
    owner: "owner",
    grants: [{ id: "g", delegate: "operator", version: 1, allowed: true, limit, spent: 0 }],
  });
  const r = (id, credits, extra = {}) => ({
    id,
    owner: "owner",
    delegate: "operator",
    wallet: "w",
    grant: "g",
    grantVersion: 1,
    credits,
    ...extra,
  });
  return [
    {
      // Generous headroom: redelivery's double-counted eligibility check still clears the limit,
      // so recovery only needs to notice the debit already landed (an idempotent re-debit), not
      // fall back to lookup to avoid a wrongful rejection.
      id: "case-crash-000",
      seed: "crash-0",
      unknown: 0,
      wallets: [wallet(100)],
      jobs: [{ grants: [], requests: [r("first", 6), r("second", 6), r("third", 4)], crashAfterDebit: 1 }],
    },
    {
      // Exact-fit budget: after the crash, the redelivered process's own fresh `describe` call
      // reports the crashed request's credits as already spent, so re-adding them for that same
      // request's own eligibility check overshoots the limit. A subject that rejects on that basis
      // without consulting `lookup` first wrongly abandons executed, still-authorized work.
      id: "case-crash-001",
      seed: "crash-1",
      unknown: 0,
      wallets: [wallet(12)],
      jobs: [{ grants: [], requests: [r("first", 10), r("second", 1), r("third", 1)], crashAfterDebit: 1 }],
    },
    {
      // Crash lands on the second debit, after the first has already executed (and, in a
      // correctly built journal, been durably recorded): redelivery must leave "first" alone,
      // resolve "second" (also over budget by the same double-count as above) via lookup, and
      // still finish "third".
      id: "case-crash-002",
      seed: "crash-2",
      unknown: 0,
      wallets: [wallet(9)],
      jobs: [{ grants: [], requests: [r("first", 3), r("second", 5), r("third", 1)], crashAfterDebit: 2 }],
    },
    {
      // An ineligible request (wrong owner) sits between two eligible ones; the crash lands on
      // the very first debit, before the ineligible request is even reached. Recovery must still
      // reject the ineligible request on redelivery and finish the remaining eligible work.
      id: "case-crash-003",
      seed: "crash-3",
      unknown: 0,
      wallets: [wallet(15)],
      jobs: [
        {
          grants: [],
          requests: [
            r("first", 5),
            r("wrong-owner", 1, { owner: "operator" }),
            r("second", 5),
            r("third", 5),
          ],
          crashAfterDebit: 1,
        },
      ],
    },
  ];
}
export function scenarios() {
  return [
    ...Array.from({ length: 12 }, (_, seed) => {
      const wallet = {
        id: "w",
        owner: "owner",
        grants: [
          {
            id: "g",
            delegate: "operator",
            version: 1,
            allowed: true,
            limit: seed === 0 ? 100 : 10 + seed,
            spent: 0,
          },
        ],
      };
      const other = {
        id: "other",
        owner: "other-owner",
        grants: [{ id: "separate", delegate: "helper", version: 1, allowed: true, limit: 99, spent: 0 }],
      };
      const r = (id, credits, extra = {}) => ({
        id,
        owner: "owner",
        delegate: "operator",
        wallet: "w",
        grant: "g",
        grantVersion: 1,
        credits,
        ...extra,
      });
      return {
        id: `case-${String(seed).padStart(3, "0")}`,
        seed,
        unknown: seed % 3,
        wallets: [wallet, other],
        jobs:
          seed === 0
            ? [{ grants: [], requests: [r("first", 2)] }]
            : [
                {
                  grants: [],
                  requests: [
                    r("first", 6),
                    r("second", 6),
                    r("wrong-owner", 1, { owner: "operator" }),
                    r("third", 4),
                  ],
                },
                {
                  grants: [
                    {
                      wallet: "w",
                      id: "g",
                      delegate: seed % 2 ? "replacement" : "operator",
                      version: 2,
                      allowed: seed % 4 !== 0,
                      limit: 10 + seed,
                    },
                  ],
                  requests: [
                    r("first", 6),
                    r("old-version", 1),
                    r("fresh", 2, { grantVersion: 2, delegate: seed % 2 ? "replacement" : "operator" }),
                    r("independent", 3, {
                      wallet: "other",
                      owner: "other-owner",
                      delegate: "helper",
                      grant: "separate",
                    }),
                  ],
                },
              ],
      };
    }),
    ...crashCases(),
    ...crashCases().map((scenario, index) => ({
      ...scenario, id: `case-crash-pending-${index}`, unknown: 1,
    })),
    { ...crashCases()[1], id: "case-crash-absent", unknown: 2 },
  ];
}
export const checkIds = [
  "completion",
  "ownership",
  "aggregate_budget",
  "payload",
  "receipt_history",
  "decisions",
  "preservation",
];
