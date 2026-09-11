# Checker input and output contract

Submit `checker.mjs` exporting `run({cases})`. Each case is `{token,cells}`;
tokens are opaque. A case is correct only when every cell meets SEMANTICS.md.
Node built-ins and submitted helper modules are available; network access is disabled.

Each cell is one independent execution across one or more jobs:

- `input`: original `services`, release catalog `releases`, and pre-existing `stages`.
- `runs`: normally one entry per completed job, containing `job`, `requests`,
  job-entry services as `[id,service]` pairs in `entry`, staging records present
  at job entry in `stagesAtEntry`, final `state` pairs, remaining `stages`,
  recorded `report`, and that job's ordered `observations`. A job whose delivery
  was interrupted before a different, later-dispatched job for the same service
  ran to completion appears as two entries sharing the same `job`: an earlier one
  with `report:null, interrupted:true` (its interrupted attempt — observations happened and are
  still subject to every legality rule, but nothing was ever delivered back, so
  there is no report or final cleanup to judge yet) and a later one that resumes
  and completes it. `stagesAtEntry` matters here: a still-pending, not-yet-resumed
  job's own staging record can legitimately still be present when a different job
  that ran and finished around it completes, so end-of-job cleanup is judged
  against what existed when that job itself started, not the scenario's original.
- `observations`: all ordered API interactions `{seq,method,request,value}` for
  one run. A committed operation whose response was lost has `interrupted:true`.
- `interruptions`: recorded process interruption boundaries `{job,method,seq}`.
- `state`, `stages`: final external state. `actions` contains, across every job in
  execution order, `{job,kind,service,...}` (stage actions also carry the created record ID as `stageId`) stage/bind/warm history — in
  particular, useful for confirming a service was never staged, bound, or warmed
  by a job that a different, later-dispatched job had already staged it out from
  under.
- `reports`: returned service reports, to be judged against the external facts.

An observation records the actual effect and response, including effects whose
response was lost. Reports are required output, not evidence that their claims are
true. A result's `status` can be `'deployed'`, `'rolled-back'`, `'unavailable'`,
or `'superseded'` (see SEMANTICS.md). No expected rollout plan, private legality
annotations or grading verdicts are supplied. Unknown metadata can be ignored.

Return `{verdicts:{[token]:{ok:boolean,reasons?:string[]}}}` for every case.
Reasons are optional diagnostics and their wording is not graded. Accept correct
alternative strategies. Do not mutate inputs. Two calls in the same process must
return identical outputs. Both calls share 60 seconds, one CPU and 1 GiB memory.
Both the service and independent validator must pass for overall reward one.

Only a host-recorded interrupted:true fragment may omit its report, and its job must
later complete. A candidate-returned null is not an interruption. Staging ownership
is derived from creation actions, so cleanup legality never requires a redundant stages read.
