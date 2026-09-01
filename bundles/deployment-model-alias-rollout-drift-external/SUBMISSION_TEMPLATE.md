# Submission template

Create `submission/subject.mjs` with this shape:

```js
export const subject = {
  id: "external-submission",
  label: "External submitted subject",
  run(view, deployment) {
    // Use the deployment facade as current truth.
    // Do not trust cached alias maps, provider summaries, or subject-owned model claims.
    return { decisions: [], audit: [] };
  },
};
```

Do not submit verifier, reference, hidden scenarios, source internals or answer matrices.
