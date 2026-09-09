import { equal, verdicts } from "./checker-utils.mjs";
const visible = (rows) => rows.map(({ traceId, step, entity, field, value }) => ({ traceId, step, entity, field, value }));
function check(cell) {
  const { input, effects, actions, perAttempt, reports } = cell;
  const expected = input.events.map(({ step, entity, field, value }) => ({ traceId: input.traceId, step, entity, field, value }));
  if (perAttempt.length !== input.attempts || reports.length !== input.attempts) return false;
  if (!equal(visible(effects), expected) || !perAttempt.every((rows) => equal(visible(rows), expected))) return false;
  for (const action of actions) {
    if (!action.state.connected || !action.state.ready || action.readAttempt !== action.attempt || !equal(action.read, action.state)) return false;
  }
  if (input.confirmation && effects.some((e) => e.action?.confirmation?.entity !== e.entity || e.action.confirmation.value !== e.value)) return false;
  return reports.every((r) => equal(r, { traceId: input.traceId, steps: input.events.map((e) => ({ step: e.step, status: "completed" })) }));
}
export const run = ({ cases }) => verdicts(cases, check);
