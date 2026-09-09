// Real mid-job process death: `crashAfterPublish: N` kills the subject's process after its Nth
// `api.publish` call has already landed server-side, before it can see the response, report, or
// finish. The job is then redelivered identically (the real-world response to an unconfirmed
// attempt). A subject that doesn't consult `receipts()` before redelivering double-publishes the
// interrupted request, which the pre-existing `history` check already catches — no crash-specific
// check is needed, only a genuine interruption the pre-existing checks were never exercised against.
function crashCases() {
  return Array.from({ length: 4 }, (_, seed) => {
    const grant = { destination: "archive", version: 1, allowed: true };
    const src = (id, value) => ({
      id,
      revision: 1,
      kind: "source",
      value,
      authority: "approved",
      retracted: false,
    });
    const request = (id, root) => ({ id, root, destination: "archive", grantVersion: 1 });
    return {
      id: `case-crash-${String(seed).padStart(3, "0")}`,
      jobs: [
        {
          updates: [src("x", `x${seed}`), src("y", `y${seed}`), src("z", `z${seed}`)],
          // Three independently-eligible requests in one job, crash lands after the first
          // publish: the redelivery must recognize that one via receipts and still complete
          // the other two, in order, exactly once each.
          requests: [request("r1", "x"), request("r2", "y"), request("r3", "z")],
          grants: [grant],
          crashAfterPublish: 1,
        },
      ],
    };
  });
}
export function scenarios() {
  return [...Array.from({ length: 12 }, (_, seed) => {
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
  }), ...crashCases()];
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
