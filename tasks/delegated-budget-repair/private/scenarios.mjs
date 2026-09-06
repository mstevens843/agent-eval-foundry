export function scenarios() {
  return Array.from({ length: 12 }, (_, seed) => {
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
  });
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
