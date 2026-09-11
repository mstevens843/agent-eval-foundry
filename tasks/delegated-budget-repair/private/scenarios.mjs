export const checkIds = ["completion", "aggregate_budget", "receipt_history", "decisions"];
export function scenarios() {
  const rows = [];
  for (let seed = 0; seed < 18; seed++) {
    const wallets = Array.from({ length: seed % 3 === 0 ? 4 : 2 }, (_, i) => ({
      id: "wallet-" + i,
      owner: "owner-" + i,
      grants: Array.from({ length: seed % 3 === 0 ? 4 : 2 }, (_, g) => ({
        id: "grant-" + g,
        delegate: "delegate-" + g,
        version: 1,
        allowed: true,
        limit: 10 + g,
      })),
    }));
    const r = (id, kind, reservation, credits, extra = {}) => ({
      id,
      kind,
      reservation,
      credits,
      wallet: "wallet-0",
      grant: "grant-0",
      owner: "owner-0",
      delegate: "delegate-0",
      grantVersion: 1,
      ...extra,
    });
    const reserve = r("reserve-A", "reserve", "A", 8);
    const release = r("release-A", "release", "A", 3);
    const capture = r("capture-A", "capture", "A", 5);
    const jobs = [
      {
        grants: [],
        requests: [
          reserve,
          r("overlap", "reserve", "B", 3),
          r("other-grant", "reserve", "G", 11, { grant: "grant-1", delegate: "delegate-1" }),
          r("other-wallet", "reserve", "A", 10, { wallet: "wallet-1", owner: "owner-1" }),
          capture,
        ],
      },
      {
        grants: [{ wallet: "wallet-0", id: "grant-0", version: 2, limit: 6, allowed: seed % 2 === 0 }],
        requests: [
          capture,
          release,
          r("reserve-C", "reserve", "C", 1, { grantVersion: 2 }),
          r("release-C", "release", "C", 1),
          r("capture-other", "capture", "G", 11, { grant: "grant-1", delegate: "delegate-1" }),
        ],
      },
      {
        grants: [
          {
            wallet: "wallet-0",
            id: "grant-0",
            version: 3,
            limit: 10,
            allowed: true,
            delegate: "new-delegate",
          },
        ],
        requests: [
          release,
          r("reserve-D", "reserve", "D", 5, { grantVersion: 3, delegate: "new-delegate" }),
          r("late-release", "release", "A", 1),
          r("capture-D", "capture", "D", 5, { delegate: "new-delegate" }),
          reserve,
        ],
      },
      {
        grants: [],
        requests: [
          r("boundary", "reserve", "E", 1, { grantVersion: 3, delegate: "new-delegate" }),
          r("wrong-owner", "reserve", "bad", 1, { owner: "intruder" }),
          r("stale-version", "reserve", "bad-version", 1),
        ],
      },
    ];
    if (wallets.length === 4)
      jobs[0].requests.push(
        r("third-grant", "reserve", "third", 12, { grant: "grant-2", delegate: "delegate-2" }),
        r("third-wallet", "reserve", "third", 13, {
          wallet: "wallet-2",
          owner: "owner-2",
          grant: "grant-3",
          delegate: "delegate-3",
        }),
        r("fourth-wallet", "reserve", "fourth", 10, { wallet: "wallet-3", owner: "owner-3" }),
      );
    if (seed % 3 === 1) jobs[0].race = [{ wallet: "wallet-0", id: "grant-0", version: 2, limit: 7 }];
    if (seed % 3 === 2)
      jobs[1].race = [{ wallet: "wallet-0", id: "grant-0", version: 3, limit: 4, allowed: false }];
    if (seed > 5)
      jobs[seed % 4].interrupt = { method: seed % 2 ? "api.resolve" : "api.lookup", count: (seed % 3) + 1 };
    rows.push({ id: "case-" + String(seed).padStart(3, "0"), wallets, jobs, lag: seed % 3 });
  }
  rows.push({
    id: "clean",
    wallets: [
      { id: "w", owner: "o", grants: [{ id: "g", delegate: "d", version: 1, allowed: true, limit: 100 }] },
    ],
    jobs: [
      {
        grants: [],
        requests: [
          {
            id: "r",
            kind: "reserve",
            reservation: "h",
            credits: 1,
            wallet: "w",
            owner: "o",
            delegate: "d",
            grant: "g",
            grantVersion: 1,
          },
        ],
      },
    ],
    lag: 0,
  });
  const focused=structuredClone(rows.at(-1));focused.id='closed-and-over-settlement';
  const r=focused.jobs[0].requests[0];
  focused.jobs[0].requests=[{...r,credits:4},{...r,id:'close',kind:'release',credits:4},{...r,id:'reopen-closed'},{...r,id:'new',reservation:'other',credits:2},{...r,id:'over-capture',kind:'capture',reservation:'other',credits:3},{...r,id:'wrong-delegate',reservation:'third',delegate:'intruder'}];
  focused.jobs[0].requests.push({...r,id:'owner-alone',reservation:'owner-case',owner:'intruder'});
  rows.push(focused);
  const exact=structuredClone(focused);exact.id='exact-string-identities';
  exact.jobs[0].requests=[{...r,id:'first',reservation:'1'},{...r,id:'second',reservation:'01'},{...r,id:'third',reservation:'constructor'},{...r,id:'fourth',reservation:'__proto__'},{...r,id:'settle',kind:'capture',reservation:'01'}];rows.push(exact);
  return rows;
}
