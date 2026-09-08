# 16 — Document export repair

One Codex attempt, requested Sol / xhigh. Authoring **15m 30s**. Recorded reward **1**: service **29/29 scenarios**, checker **13/13 candidates**, including both correct implementations and all eleven negative controls with the required obligation named. No execution error or retry was recorded.

## What the task was, in plain English

Repair a support-record export pipeline. Tickets contain message headers, nested messages, JSON attachments, text attachments and binary attachments. Some payloads are base64 or gzip encoded. The service must remove exactly the information identified by an explicit privacy policy while retaining the useful document, its relationships and its encoding choices.

Deleting everything is wrong. So is finding most private text while missing a nested header. Literal matches are case-sensitive and choose the longest match at each position in the original string; replacement text must not itself be redacted again. JSON field rules and structural metadata follow different policies.

## What was in the frozen package

A functioning multi-file exporter, public format/policy/API definitions, one visible test, hidden service scenarios and a separate checker requirement. The independent host records actual publications and decoded documents; a claimed count is not a deliverable. Binary bytes, message/part identities and relationships are checked alongside privacy.

Before this attempt, preflight corrected a checker-input defect: the old author witness pooled other candidates' read results to discover the source population. The frozen version instead supplies each checker cell's original ticket list, policy and raw source tickets independently. Local tests confirm that empty work is accepted and no work on a nonempty request is rejected even without a companion correct candidate. This was a pre-dispatch validity repair, not a change made after seeing the solve.

## What Codex actually changed

The service repair was small and concentrated in two modules.

First, the original literal filter performed successive replacements, one literal at a time. That can select a shorter overlapping match first or reprocess inserted replacement text. Codex replaced it with a scan over the original input, selecting the longest matching literal and appending unchanged spans plus the marker.

Second, the transform handled text and JSON attachments but omitted the nested-message media type. Codex added recursive decode-transform-encode handling for that case. Existing recursive JSON-field traversal, codec support and binary preservation were already present; the diff does not support crediting those as newly implemented repairs, even though its final summary listed them as supported behavior.

The other substantial deliverable was a **485-line standalone checker**. It decodes actual successful publications, compares messages/parts with raw sources, checks requested identities and duplicate successful publications, and separates privacy from preservation reasons. It accepts semantic equivalence in decoded JSON and gzip content instead of demanding identical serialization bytes. Diagnostic reports are not its authority.

## How it tested the submission

The capture contains eight completed shell-command events. An initial Git-status command failed because the staged workspace was not a Git repository; the agent continued normally. That recovered inspection error is not a failed trial execution.

It ran the single supplied test and module syntax checks. It then created synthetic execution traces covering nested compressed JSON/messages, overlapping literals, JSON-field replacement, altered relationships, swapped publication identity, duplicate publication, missing work and an empty request. The recorded checker output accepted the good and empty cases and rejected the five bad variants with relevant reasons. Repeated checker calls returned the same output in that local exercise.

A separate shell assertion program checked decoded nested values, binary byte preservation, original relationship arrays and literal-replacement behavior. No new retained test files were submitted, and the capture does not show a large randomized fuzz campaign. The useful distinction is between targeted assertions that actually ran and broader testing claims the record does not establish.

## Why the package was solved

The privacy/preservation tension is genuine, but most supporting machinery already worked. The two missing behaviors map directly to explicit contract paragraphs: original-input longest-match scanning and recursive nested-message handling. Once those were implemented, much of the transformation followed ordinary structured traversal.

The checker imposed additional work, but the newly complete raw input made the correct comparison identifiable. The agent implemented both sides of the contract rather than choosing privacy at the expense of useful content. This attempt does not demonstrate a model weakness or establish that a larger document wrapper would make the underlying repair difficult.

## What to retain and what to test next

Keep raw authoritative inputs, decoded semantic comparison, exact structural preservation and both empty/nonempty controls. The ability to accept alternative gzip/JSON serialization is important: byte-level equality would manufacture failures for correct implementations.

A useful successor audit would compare the saved checker against independent correct transformations with varied serialization, field nesting and literal overlap, as well as narrower mutations affecting only one obligation. The checker's classification of a wrong transformation into privacy versus preservation deserves separate scrutiny; passing this thirteen-candidate bank is not proof that every possible malformed export receives precisely the right reason.

Increasing nesting or file count alone is not a supported hardness improvement. A substantially different professional workflow would need its own coherent requirements and bounded solution. No confirmed in-contract submission defect or false-positive grade was found here; future probes must remain labeled diagnostic work, not retroactive model trials.

## Evidence boundary

[Sanitized batch record](../evidence/2026-09-08-fourth-five.json) preserves the original package/profile/source identities, results and verified artifact hashes. [Current task source](../../../tasks/document-export-repair/) is separately maintained. This report uses observable commands, outputs and submitted code, not private internal reasoning or independent blind adjudication. No additional provider calls or diagnostic regrades were used for the analysis.
