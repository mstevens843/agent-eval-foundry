export function scenarios() {
  return Array.from({ length: 12 }, (_, seed) => {
    const a = {
      id: "a",
      revision: 1,
      kind: "source",
      value: `approved ${seed}`,
      authority: "approved",
      retracted: false,
    };
    const b = {
      id: "b",
      revision: 1,
      kind: "source",
      value: `external ${seed}`,
      authority: seed % 3 === 0 ? "approved" : "external",
      retracted: false,
    };
    const sentinel = {
      id: "unrelated",
      revision: 1,
      kind: "source",
      value: `preserve ${seed}`,
      authority: "approved",
      retracted: false,
    };
    const summary = { id: "summary", revision: 1, kind: "derived", parents: ["a", "b"], separator: " / " };
    const root = { id: "root", revision: 1, kind: "derived", parents: ["summary", "a"], separator: " + " };
    const grant = { destination: "archive", version: 1, allowed: true };
    const request = (id, root, grantVersion = 1) => ({ id, root, destination: "archive", grantVersion });
    return {
      id: `case-${String(seed).padStart(3, "0")}`,
      jobs: [
        { updates: [a, b, sentinel, summary, root], requests: [request("initial", "a")], grants: [grant] },
        {
          updates:
            seed === 0
              ? []
              : [
                  { ...a, revision: 2, value: `revised ${seed}` },
                  ...(seed % 4 === 0 ? [{ ...b, revision: 2, retracted: true }] : []),
                ],
          requests: [
            request("summary-job", "root"),
            request("retained", "unrelated"),
            ...(seed % 2 ? [request("initial", "a")] : []),
          ],
          grants: [grant],
        },
        {
          updates:
            seed === 0
              ? []
              : [
                  {
                    ...b,
                    revision: 3,
                    value: `legitimate ${seed}`,
                    authority: "approved",
                    retracted: seed % 5 === 0,
                  },
                  ...(seed % 6 === 0 ? [{ ...summary, revision: 2, parents: ["root"] }] : []),
                ],
          requests: [
            request("last", "root", seed % 2 === 0 ? 2 : 1),
            request("new-retained", "unrelated", 2),
          ],
          grants: [{ ...grant, version: 2 }],
        },
      ],
    };
  });
}
export const checkIds = [
  "completion",
  "authority",
  "values",
  "lineage",
  "history",
  "decisions",
  "preservation",
];
