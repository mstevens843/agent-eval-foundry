# Build and attestation contract

Each next({}) returns a round {id,files,actions,targets,callBudget}, or null.
files maps exact paths to text. An action is {id,entry,tool,flags,deps}; deps is an
ORDERED list {alias,action}. flags is identity or upper. Both action dependencies and
file includes are acyclic. File text may contain @include(path), replaced recursively
with that exact file's expanded text. Other text is literal; repeated includes repeat.
The required artifact for an action is produced from its expanded entry plus the ordered
dependency artifacts, using the named compiler tool/version and flags.

compile({action,entry,tool,flags,files:[{path,text}],dependencies:[{alias,handle}]})
is the attesting compiler service. It expands entry against the submitted file map,
uppercases that expanded text iff flags=upper, and emits UTF-8 JSON.stringify of:
[tool,flags,expandedText,dependencies.map(d=>[d.alias,dependencyArtifact.bytes])].
The issued {handle} identifies immutable {recipe,bytes}. inspect({handle}) returns
that record or null; artifacts({}) lists all currently available handles, including
retained earlier builds. Only compiler-issued handles can be published. This attestation
is a required deliverable.
A stale handle or correct-looking claimed metadata does not create a current attestation.

For every requested target, the published handle must bind that action's exact entry,
tool and flags, every used file path to its CURRENT text, and each ordered dependency
alias to a recursively current attestation of the declared dependency action.
Extra UNUSED input files in a compiler recipe are allowed; order of its file rows is
irrelevant. A file path occurs once in a recipe. There is no preferred cache key, traversal,
or build ordering beyond genuine dependencies. Semantically valid equivalent previously
issued handles are acceptable; handles need not be freshly generated.
Artifact bytes must equal the required compiler result. No action is executable code.

publish({round,outputs:[{target,handle}]}) records the deliverable. Publish exactly once
per round, including an empty target list, before requesting the next round. Output order
is irrelevant; no duplicate, missing or foreign targets. Existing attestations are immutable.
Every compile CALL counts toward that round's callBudget, including unsuccessful calls.
This product requires incremental reuse; rebuilding everything is allowed only when it
fits the declared budget. Every supplied round has a valid solution within that budget.
Inspecting all cached handles and reading current source has no compile cost.

next advances even if output is missing. compile returns {error:"recipe"} without an
artifact for missing sources/dependencies or malformed shapes. inspect unknown returns
null. publish returns {stored:true} for bounded outer shapes, otherwise {error:"shape"}.
Semantic mistakes that satisfy shapes are captured, not silently corrected.
Returned summaries are not publications. The API's immutable artifact ledger is the
authority; the subject cannot mint an attestation merely by computing bytes locally.

Bounds: up to 6 actions, 10 files, graph/include depth <=4, 0–3 deps/action, 1–5 rounds,
<=60 stored artifacts, <=512 UTF-8 bytes/source file and <=4096 bytes/expanded artifact.
Tool/flags choices and all rules are visible. Budget 0–8. Only targets' transitive closure
is required; unrelated artifacts are preserved by the append-only service.

## Execution environment

Node 24 and built-ins are available offline during grading. Entry point: entry.mjs
exports subject.run(view, api). All API methods are asynchronous and take one object.
Submitted return values are diagnostic only; required outputs must be published.
Any correct algorithm or module layout is allowed. The workspace may contain at most
128 regular files, 8 MiB total and depth 16; no lingering subprocesses.
There are 45 seconds per service invocation, not per human/agent repair. Transport:
4000 frames including begin/report/finish (3997 API calls maximum), 64 KiB UTF-8 JSON
per frame, 16 MiB per channel and combined diagnostics. Supplied views/responses and
compact correct request payloads fit 48 KiB jointly with the domain bounds; independent
maxima need not occur together. No timeout-only difficulty or unknown API is intended.

