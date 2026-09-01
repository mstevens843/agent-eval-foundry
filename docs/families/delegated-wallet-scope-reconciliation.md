# Delegated Wallet Scope Reconciliation

`delegated-wallet-scope-reconciliation` is the first full descendant built after a promoted family
was cleanly solved by a smoke trial.

Parent family: `access-token-scope-expansion`.

Source probe: `delegated-wallet-scope-reconciliation-probe`.

The family preserves the access-token mechanism that requested authority is not approved authority.
It adds the harder descendant mechanism that cached or delegated wallet authority is not current
authority. A subject must reconcile current wallet policy, delegation, token and remaining budget
before executing a spend, then report an audit trail that matches the verifier-owned ledgers.

Current local evidence:

- 804 measured scenarios from an 82,944-point declared space.
- reference passes every scenario.
- 10/10 known-bad subjects and baselines fail intended named checks.
- 3 mutant-detection axes.
- leak-checked 9-file challenge package.
- package hash `2140032d835a87ff254d01b6b4652f21`.
- one counted OpenAI/Codex smoke trial, `delegated-wallet-2026-08-o1`, passed all 804 scenarios.

Status: validation-mode local evidence plus a clean smoke pass. The clean pass fires the
pre-registered already_solved_or_needs_evolution signal, so full matrix spend remains blocked. The
family is package-backed, human-ready and adversarial-ready, but it is not difficulty-evidenced.
