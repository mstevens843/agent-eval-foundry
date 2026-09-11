import { equal, verdicts } from "./checker-utils.mjs";
function check(c) {
  const expected = c.input.events.map((e) => ({
    operationId: JSON.stringify([c.input.traceId, e.step]),
    entity: e.entity,
    field: e.field,
    value: e.value,
  }));
  const visible = (rows) =>
    rows.map(({ operationId, entity, field, value }) => ({ operationId, entity, field, value }));
  if (
    c.perAttempt.length !== c.input.attempts ||
    c.reports.length !== c.input.attempts ||
    !equal(visible(c.effects), expected)
  )
    return false;
  if (!c.perAttempt.every((rows) => equal(visible(rows), expected))) return false;
  if (c.input.confirmation && !c.effects.every((e) => e.confirmation?.operationId === e.operationId))
    return false;
  if (
    !c.actions.every((a) =>
      expected.some((e) => ["operationId", "entity", "field", "value"].every((k) => e[k] === a[k])),
    )
  )
    return false;
  return c.reports.every((r) =>
    equal(r, {
      traceId: c.input.traceId,
      steps: c.input.events.map((e) => ({ step: e.step, status: "completed" })),
    }),
  );
}
export const run = ({ cases }) => verdicts(cases, check);
