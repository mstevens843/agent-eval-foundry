/** Instructions travel with the export; paths below are relative to its root. */
export function recipientReadme(id: string, digest: string): string {
  return `# ${id}

This self-contained Foundry package includes its runtime archive, grader, controls and validation evidence.

Package digest: \`${digest}\`.

## Validate this package

Use Node 22.22.1 and Docker with a running daemon. The runtime platform is recorded in
\`node package/tooling/local-cli.mjs portfolio inspect .\`; loading an archive does not
convert it to another CPU architecture. Allow approximately 4 GiB free for this workflow.
Run these commands from the directory containing this README:

\`\`\`sh
node package/tooling/local-cli.mjs doctor --package .
node package/tooling/local-cli.mjs portfolio load-runtime .
node package/tooling/local-cli.mjs portfolio validate . recipient-check
\`\`\`

Every assurance result should be \`pass\`. A negative control passes assurance when the
grader correctly rejects it. Results and diagnostics are saved in \`recipient-check/\`.
Choose a new output directory for each run; existing evidence is never overwritten.
Validation is offline after runtime loading and makes zero model calls.

## Grade your own submission

Copy \`visible/public/\` to a separate working directory and edit that copy. The submission
must retain \`entry.mjs\` and its supporting files. Then run:

\`\`\`sh
node package/tooling/local-cli.mjs portfolio grade . /absolute/path/to/submission submission-check
\`\`\`

Inspect \`submission-check/result.json\` for service scenarios and any required checker
verdicts. A process/infrastructure error is not a demonstrated semantic failure.

## Files and scope

- \`visible/public/\`: the only task files supplied to a solving agent.
- \`package/\`, \`store/\`: frozen grading and assembly contents. Keep these out of the solver workspace.
- \`runtime.tar\`: the captured Docker image, verified against the package identity.
- \`verification/\`: the original producer's assurance receipt and supporting evidence.

Local validation checks correct solutions, valid alternatives and broken controls.
It does not rerun historical model trials or establish a new benchmark failure rate.
See https://github.com/mstevens843/agent-eval-foundry for authoring and execution guides.
`;
}

export function nativeRecipientReadme(digest: string): string {
  return `# Native CAA package

Package digest: \`${digest}\`.

This export contains the native Go task, frozen runtime images and the producer's assurance.
Use Node 22.22.1, a working Docker daemon and a Foundry 0.2.0 source checkout to inspect and
repeat its full assurance workflow. Unlike Node portfolio exports, this native format does
not include a standalone JavaScript CLI. See the source checkout's docs/package-production.md.

From the installed and built Foundry source checkout, replace the path below with this export:

\`\`\`sh
pnpm foundry inspect /absolute/path/to/native-export
pnpm foundry validate /absolute/path/to/native-export
\`\`\`

Validation verifies runtime.tar before loading the images, runs the native correct/negative
controls, and writes a fresh validations/ receipt directory. It makes zero model calls.
Inspect the returned assurance path and diagnostics if a required check fails.

- tasks/caa-revalidation-repair/: complete recipient task, including protected tests.
- public/: the public instruction/environment assembly for solving agents.
- store/, runtime.tar, assurance.json, evidence/: recipient-only identity and validation material.

Only the public assembly belongs in the solver workspace. Local assurance does not reproduce
historical model attempts or imply destination acceptance.
`;
}
