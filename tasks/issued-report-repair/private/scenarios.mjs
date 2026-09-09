export const checkIds = [
  "completion",
  "amendment_content",
  "issued_history",
  "recipient_scope",
  "historical_answers",
  "dependency_order",
];
export function scenarios() {
  const out = [];
  for (let seed = 0; seed < 24; seed++) {
    const readings = [
      { id: "a", version: 1, value: 10 + seed },
      { id: "b", version: 1, value: 2 },
      { id: "c", version: 1, value: 7 },
    ];
    const definitions = [
      {
        id: "combined",
        op: "difference",
        inputs: [
          { kind: "report", id: "sum" },
          { kind: "reading", id: "c" },
        ],
      },
      {
        id: "sum",
        op: "sum",
        inputs: [
          { kind: "reading", id: "a" },
          { kind: "reading", id: "b" },
        ],
      },
      { id: "unrelated", op: "sum", inputs: [{ kind: "reading", id: "c" }] },
    ];
    const steps = [
      {
        id: "s0",
        changes: [{ id: "a", version: 2, value: 10 + seed }],
        requests: [{ report: "combined", recipient: "new" }],
        queries: [{ id: "q0", report: "combined", version: 1 }],
      },
      {
        id: "s1",
        changes: [{ id: "b", version: 2, value: null }],
        requests: [],
        queries: [{ id: "q1", report: "sum", version: 1 }],
      },
      {
        id: "s2",
        changes: [{ id: "b", version: 3, value: 5 }],
        requests: [{ report: "combined", recipient: "new" }],
        queries: [{ id: "q2", report: "combined", version: 1 }],
      },
      { id: "s3", changes: [], requests: [{ report: "combined", recipient: "new" }], queries: [] },
    ];
    if (seed % 2) definitions.reverse();
    out.push({
      id: "case-" + String(seed).padStart(3, "0"),
      readings,
      definitions,
      initialPublished: true,
      initialAudience: [
        { report: "sum", recipient: "reader" },
        { report: "combined", recipient: "reviewer" },
        { report: "unrelated", recipient: "outsider" },
      ],
      steps,
    });
  }
  out.push({
    id: "case-024",
    readings: [{ id: "m", version: 1, value: 3 }],
    definitions: [{ id: "r", op: "sum", inputs: [{ kind: "reading", id: "m" }] }],
    initialPublished: false,
    initialAudience: [],
    steps: [{ id: "step", changes: [], requests: [{ report: "r", recipient: "a" }], queries: [] }],
  });
  out.push({
    id: "case-025",
    readings: [{ id: "m", version: 1, value: 3 }],
    definitions: [{ id: "r", op: "sum", inputs: [{ kind: "reading", id: "m" }] }],
    initialPublished: true,
    initialAudience: [],
    steps: [{ id: "step", changes: [], requests: [], queries: [] }],
  });
  // A first-time request must be satisfied with the latest version even on a step where
  // the report is NOT newly versioned. Every other scenario above only ever introduces a
  // brand-new recipient on a step that also happens to (re)version the report, so a
  // repair that only fires its delivery loop inside the "isNew" branch would still pass
  // all of them. Here "r" is already published (version 1) with no receipts at all, and
  // the one step makes no reading change (isNew is false for "r"), yet requests it for a
  // recipient who has never received it — the delivery is still owed regardless.
  out.push({
    id: "case-026",
    readings: [{ id: "m", version: 1, value: 5 }],
    definitions: [{ id: "r", op: "sum", inputs: [{ kind: "reading", id: "m" }] }],
    initialPublished: true,
    initialAudience: [],
    steps: [{ id: "step", changes: [], requests: [{ report: "r", recipient: "newguy" }], queries: [] }],
  });
  return out;
}
