import assert from "node:assert/strict";
import { applyTrialOutcome, initialTaskState, nextTrial } from "./successor-adaptive-policy.mjs";

// I/O is injected so the actual concurrent scheduler can be exercised without provider calls.
export async function executeCampaign(preparation, io) {
  let attemptsLaunched = 0;
  let inFlight = 0;
  let peakConcurrent = 0;
  assert(preparation.packages.length <= preparation.maxConcurrent);
  assert.equal(new Set(preparation.packages.map(({ id }) => id)).size, preparation.packages.length);
  io.emit({ stage: "campaign-started", tasks: preparation.packages.length });
  const settled = await Promise.allSettled(
    preparation.packages.map(async (task) => {
      let state = initialTaskState(task.id);
      const evidence = [];
      while (nextTrial(state)) {
        const wanted = nextTrial(state);
        const slot = preparation.slots.find((slot) => slot.id === task.id && slot.trial === wanted.trial);
        assert(slot);
        assert.equal(slot.target, wanted.provider);
        assert(attemptsLaunched < preparation.maxProviderCalls, "Attempt cap reached");
        assert(inFlight < preparation.maxConcurrent, "Concurrency cap reached");
        attemptsLaunched++;
        inFlight++;
        peakConcurrent = Math.max(peakConcurrent, inFlight);
        io.emit({
          stage: "launch",
          id: task.id,
          trial: slot.trial,
          target: slot.target,
          attemptsLaunched,
          inFlight,
        });
        let scored;
        let failure;
        try {
          await io.launch(task, slot);
          scored = await io.score(task, slot);
          assert([0, 1].includes(scored.countedReward), "Incomplete or non-binary grade");
          assert.equal(scored.id, task.id);
          assert.equal(scored.trial, slot.trial);
          assert.equal(scored.target, slot.target);
        } catch (error) {
          failure = String(error);
        }
        if (failure !== undefined) {
          state = applyTrialOutcome(state, "unscored");
          const incident = {
            id: task.id,
            trial: slot.trial,
            target: slot.target,
            countedReward: null,
            error: failure,
            automaticRetries: 0,
            state,
          };
          await io.save(`incidents/${task.id}/trial-${slot.trial}.json`, incident);
          inFlight--;
          io.emit({ stage: "task-stopped-unscored", ...incident });
        } else {
          state = applyTrialOutcome(state, scored.countedReward === 1 ? "pass" : "clean-fail");
          evidence.push(scored);
          // Persistence failure stops this loop. It must never be applied to the next trial as
          // an unscored result or cause another provider launch after an observed pass.
          await io.save(`adjudicated/${task.id}/trial-${slot.trial}.json`, { ...scored, state });
          inFlight--;
          io.emit({
            stage: "trial-result",
            ...scored,
            counted: state.counted,
            cleanFailures: state.cleanFailures,
            stopReason: state.stopReason,
          });
        }
      }
      const outcome = { ...state, evidence };
      await io.save(`outcomes/${task.id}.json`, outcome);
      io.emit({
        stage: "task-finished",
        id: task.id,
        counted: state.counted,
        cleanFailures: state.cleanFailures,
        providers: state.providers,
        stopReason: state.stopReason,
      });
      return outcome;
    }),
  );
  // Drain all independently running jobs before surfacing a controller/persistence error.
  const errors = settled.filter((result) => result.status === "rejected");
  if (errors.length)
    throw new AggregateError(
      errors.map((result) => result.reason),
      "Campaign incomplete; inspect retained events and jobs. Do not redispatch.",
    );
  return {
    attemptsLaunched,
    peakConcurrent,
    maxConcurrent: preparation.maxConcurrent,
    maxProviderCalls: preparation.maxProviderCalls,
    automaticRetries: 0,
    outcomes: settled.map((result) => result.value),
  };
}

export function replayCampaignEvents(preparation, events) {
  const states = new Map(preparation.packages.map(({ id }) => [id, initialTaskState(id)]));
  const active = new Map();
  const finished = new Set();
  let started = false;
  let ended = false;
  let attemptsLaunched = 0;
  let peakConcurrent = 0;
  for (const event of events) {
    assert(!ended, "Event after campaign completion");
    if (event.stage === "campaign-started") {
      assert(!started, "Duplicate campaign start");
      started = true;
      assert.equal(event.tasks, states.size);
      continue;
    }
    assert(started, "Event before campaign start");
    if (event.stage === "campaign-finished") {
      assert.equal(finished.size, states.size, "Premature campaign completion");
      assert.equal(active.size, 0);
      assert.equal(event.attemptsLaunched, attemptsLaunched);
      assert.equal(event.peakConcurrent, peakConcurrent);
      ended = true;
      continue;
    }
    const state = states.get(event.id);
    assert(state, "Unknown task event");
    if (event.stage === "launch") {
      const wanted = nextTrial(state);
      assert(wanted, "Launch after a package stopped");
      assert(!active.has(event.id), "Concurrent attempts for the same package");
      assert.equal(event.trial, wanted.trial, "Skipped or duplicate trial");
      assert.equal(event.target, wanted.provider, "Wrong trial provider");
      active.set(event.id, event.trial);
      attemptsLaunched++;
      assert(attemptsLaunched <= preparation.maxProviderCalls);
      assert(active.size <= preparation.maxConcurrent);
      assert.equal(event.attemptsLaunched, attemptsLaunched);
      assert.equal(event.inFlight, active.size);
      peakConcurrent = Math.max(peakConcurrent, active.size);
    } else if (event.stage === "trial-result" || event.stage === "task-stopped-unscored") {
      assert.equal(active.get(event.id), event.trial, "Result without its active launch");
      assert.equal(event.target, nextTrial(state).provider);
      const unscored = event.stage === "task-stopped-unscored";
      if (unscored) {
        assert.equal(event.countedReward, null);
        assert.equal(event.automaticRetries, 0);
      } else assert([0, 1].includes(event.countedReward), "Non-binary counted reward");
      const next = applyTrialOutcome(
        state,
        unscored ? "unscored" : event.countedReward === 1 ? "pass" : "clean-fail",
      );
      if (unscored) assert.deepEqual(event.state, next);
      else {
        assert.equal(event.counted, next.counted);
        assert.equal(event.cleanFailures, next.cleanFailures);
        assert.equal(event.stopReason, next.stopReason);
      }
      states.set(event.id, next);
      active.delete(event.id);
    } else if (event.stage === "task-finished") {
      assert(!finished.has(event.id), "Duplicate package completion");
      assert(state.stopReason !== null && !active.has(event.id), "Premature package completion");
      for (const key of ["counted", "cleanFailures", "providers", "stopReason"])
        assert.deepEqual(event[key], state[key]);
      finished.add(event.id);
    } else throw Error(`Unexpected campaign event: ${event.stage}`);
  }
  return {
    attemptsLaunched,
    peakConcurrent,
    active: active.size,
    finished: finished.size,
    ended,
    states: [...states.values()],
  };
}
