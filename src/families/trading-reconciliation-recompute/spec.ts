export const RULES = [
  {
    code: "TRR1_RECOVER_COMMITTED_ORDER_KEY",
    text: "Every reconciliation retry MUST use the client order key committed in the durable order intent. Never derive a replacement from the current reconciler, authority epoch, or attempt.",
  },
  {
    code: "TRR2_EXACTLY_ONE_VENUE_EXECUTION",
    text: "All submissions for one order intent collectively produce exactly one venue execution.",
  },
  {
    code: "TRR3_RETRY_AFTER_UNKNOWN_ACCEPTANCE",
    text: "If a venue accepted an order immediately before its reply was lost, a later reconciler retries with the committed key. A deduplicated acceptance is successful completion.",
  },
  {
    code: "TRR4_TRUTHFUL_RECONCILIATION_REPORT",
    text: "Each report names the order intent, reconciler, authority epoch, exact key sent, and acceptance observed.",
  },
  {
    code: "TRR5_ORDER_LIVENESS",
    text: "A valid order intent must reach the venue at least once; refusing every order is incorrect.",
  },
] as const;

export const SPEC_MD = `# Trading order reconciliation specification

This task models a synthetic venue protocol, not private exchange policy. A client order key is
committed with an order intent before submission. If the venue accepts the order and its reply is
lost, later reconciliation retains the original logical identity.

## Public state

Each call receives an \`OrderRecoveryView\` containing the durable order intent, current reconciler,
current authority epoch, and attempt number. Account, symbol, side, quantity and the committed key
are all public. No market-price, fill-priority or venue-specific rule is graded.

## Rules

${RULES.map((rule) => `- **${rule.code}**: ${rule.text}`).join("\n")}

## Synthetic venue

\`venue.placeOrder(orderIntentId, request)\` is idempotent by key. Repeating one key returns the
original execution without creating another. A different key creates another accepted execution,
even for the same order intent.

The venue call and execution ledgers belong to the harness. They are absent from the subject API,
and the verifier grades those ledgers rather than trusting the subject's report.

## Hidden scenarios

Hidden cases sample only seed, reconciler count, order-set width and crash position. A multi-
reconciler \`after_venue_accept\` case means the first acceptance completed but its reply was not
durably reconciled before authority moved to another worker. Every required response is stated above.
`;
