export const checkIds = [
  "completion",
  "current_artifacts",
  "publication_scope",
  "incremental_budget",
  "retained_attestations",
];
export function scenarios() {
  const out = [];
  for (let seed = 0; seed < 24; seed++) {
    const files = {
      "a.txt": "start @include(header.txt) end",
      "header.txt": "H" + seed,
      "b.txt": "B",
      "c.txt": "C",
      "t.txt": "release",
      "unused.txt": "unrelated",
    };
    const actions = [
      { id: "a", entry: "a.txt", tool: "compiler-1", flags: "identity", deps: [] },
      {
        id: "b",
        entry: "b.txt",
        tool: "compiler-1",
        flags: "identity",
        deps: [{ alias: "base", action: "a" }],
      },
      {
        id: "c",
        entry: "c.txt",
        tool: "compiler-1",
        flags: "identity",
        deps: [{ alias: "base", action: "a" }],
      },
      {
        id: "t",
        entry: "t.txt",
        tool: "linker-1",
        flags: "identity",
        deps: [
          { alias: "left", action: "b" },
          { alias: "right", action: "c" },
        ],
      },
    ];
    const first = { id: "r0", files, actions, targets: ["t"], callBudget: 1 },
      rounds = [structuredClone(first)];
    const r1 = structuredClone(rounds.at(-1));
    r1.id = "r1";
    r1.files["header.txt"] += " changed";
    r1.callBudget = 4;
    rounds.push(r1);
    const r2 = structuredClone(r1);
    r2.id = "r2";
    r2.actions.find((a) => a.id === "c").tool = "compiler-2";
    r2.callBudget = 2;
    rounds.push(r2);
    const r3 = structuredClone(r2);
    r3.id = "r3";
    r3.actions.find((a) => a.id === "b").flags = "upper";
    r3.callBudget = 2;
    rounds.push(r3);
    const r4 = structuredClone(r3);
    r4.id = "r4";
    r4.actions.find((a) => a.id === "t").deps.reverse();
    r4.files["unused.txt"] += " changed";
    r4.callBudget = 1;
    rounds.push(r4);
    if (seed % 2) for (const r of rounds) r.actions.reverse();
    out.push({ id: "case-" + String(seed).padStart(3, "0"), seedBuilds: [first], rounds });
  }
  const round = {
    id: "r",
    files: { "a.txt": "hello" },
    actions: [{ id: "a", entry: "a.txt", tool: "compiler-1", flags: "identity", deps: [] }],
    targets: ["a"],
    callBudget: 1,
  };
  out.push({ id: "case-024", seedBuilds: [], rounds: [round] });
  out.push({
    id: "case-025",
    seedBuilds: [],
    rounds: [{ id: "r", files: {}, actions: [], targets: [], callBudget: 0 }],
  });
  // case-026: a round with 2+ targets sharing a dependency subgraph. Every prior scenario used
  // exactly one target per round, leaving both cross-target cache reuse within a single round and
  // partial-publication (a solver silently dropping one of several required targets) entirely
  // unexercised.
  const sharedFiles = { "shared.txt": "S", "x.txt": "X", "y.txt": "Y" };
  const sharedActions = [
    { id: "shared", entry: "shared.txt", tool: "compiler-1", flags: "identity", deps: [] },
    {
      id: "x",
      entry: "x.txt",
      tool: "compiler-1",
      flags: "identity",
      deps: [{ alias: "base", action: "shared" }],
    },
    {
      id: "y",
      entry: "y.txt",
      tool: "compiler-1",
      flags: "identity",
      deps: [{ alias: "base", action: "shared" }],
    },
  ];
  const multiTargetFirst = {
    id: "r0",
    files: sharedFiles,
    actions: sharedActions,
    targets: ["x", "y"],
    callBudget: 1,
  };
  const multiTargetRounds = [structuredClone(multiTargetFirst)];
  const multiTargetR1 = structuredClone(multiTargetRounds.at(-1));
  multiTargetR1.id = "r1";
  multiTargetR1.files["shared.txt"] += " changed";
  multiTargetR1.callBudget = 3;
  multiTargetRounds.push(multiTargetR1);
  out.push({ id: "case-026", seedBuilds: [multiTargetFirst], rounds: multiTargetRounds });
  return out;
}
