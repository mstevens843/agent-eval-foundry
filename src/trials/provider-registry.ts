// Provider families, and what running one actually requires.
//
// The trial layer already had adapters — how to spawn a process and classify what came back. What it
// did not have is the notion of a MODEL FAMILY: that `claude`, `codex` and `gemini` are three labs
// whose failures are the interesting comparison, and that a result from one of them is not a result
// about models.
//
// Three things live here that were previously scattered or absent:
//
//   detection      whether the CLI is on this machine, checked rather than assumed
//   invocation     the exact argv, so a campaign slot and a manual re-run are the same command
//   identity       the subject id a trial gets, normalized so one model is one subject everywhere
//
// A PROVIDER is not a MODEL. One CLI can host several models, and the two identities answer different
// questions: `claude-opus-5` and `claude-sonnet-5` are two SUBJECTS — different weights, different
// failure sets, and the thing an antichain width counts — while being one PROVIDER FAMILY, which is
// the thing a cross-lab transfer claim counts. Conflating them is how a bank of four Anthropic models
// gets reported as evidence that a mechanism transfers across labs. Every entry below therefore
// carries both, and `sharedProviderFamilies` exists so a report can say "four subjects, two labs"
// rather than picking whichever number is larger.
//
// The detection is the load-bearing part. A provider that is missing must produce a NOT_RUN slot and
// a prepared bundle, never a zero — and the difference between "this model failed" and "this model
// was never asked" is the distinction the whole counting layer exists to protect.

import { execFileSync } from "node:child_process";

export const PROVIDER_FAMILIES = ["anthropic", "openai", "google", "external"] as const;
export type ProviderFamily = (typeof PROVIDER_FAMILIES)[number];

export interface ProviderSpec {
  readonly id: string;
  readonly family: ProviderFamily;
  readonly label: string;
  /** Executable that must be on PATH. Null for `external`, which is run elsewhere by hand. */
  readonly binary: string | null;
  /** Model identifier recorded on the trial. */
  readonly model: string;
  /** Normalized subject id. One model is one subject across families and harnesses. */
  readonly subjectId: string;
  readonly effort: string | null;
  /**
   * argv template. `{instruction}` is substituted with the family's instruction.
   *
   * Recorded verbatim in the trial metadata, so the exact invocation is auditable and a reviewer can
   * re-run it without reconstructing flags from prose.
   */
  readonly command: readonly string[] | null;
  /** What the flags do, and why they are safe here. */
  readonly invocationNote: string;
  /**
   * True when this entry is a second model on a CLI that already has one.
   *
   * Purely documentary, and it exists so a report cannot accidentally present four Anthropic models
   * as four labs. The bank counts these as four subjects; the transfer claim counts them as one
   * provider family.
   */
  readonly siblingModel: boolean;
}

export const PROVIDERS: readonly ProviderSpec[] = [
  {
    id: "claude",
    family: "anthropic",
    label: "Claude Opus 5 via the Claude CLI",
    binary: "claude",
    model: "anthropic/claude-opus-5",
    subjectId: "claude-opus-5",
    effort: null,
    command: ["claude", "-p", "{instruction}", "--permission-mode", "bypassPermissions"],
    invocationNote:
      "`-p` is non-interactive. `bypassPermissions` is required because the sandbox is a fresh temp directory with nothing in it but the challenge; the model must be able to write its submission without a prompt nobody is there to answer.",
    siblingModel: false,
  },
  {
    id: "claude-sonnet",
    family: "anthropic",
    label: "Claude Sonnet 5 via the Claude CLI",
    binary: "claude",
    model: "anthropic/claude-sonnet-5",
    subjectId: "claude-sonnet-5",
    effort: null,
    command: ["claude", "--model", "sonnet", "-p", "{instruction}", "--permission-mode", "bypassPermissions"],
    invocationNote:
      "Same CLI and same flags as `claude`, with `--model sonnet`. A different model is a different SUBJECT — different weights and, as the trials show, a different failure set — and it is not a different lab. The bank counts it as a subject; the transfer claim does not count it as a provider family.",
    siblingModel: true,
  },
  {
    id: "claude-haiku",
    family: "anthropic",
    label: "Claude Haiku 4.5 via the Claude CLI",
    binary: "claude",
    model: "anthropic/claude-haiku-4-5",
    subjectId: "claude-haiku-4-5",
    effort: null,
    command: ["claude", "--model", "haiku", "-p", "{instruction}", "--permission-mode", "bypassPermissions"],
    invocationNote:
      "As `claude-sonnet`, with `--model haiku`. The smallest model available here, and therefore the one most likely to produce a catch set that is a strict superset of the others — which is what a bank needs to have any width at all.",
    siblingModel: true,
  },
  {
    id: "claude-fable",
    family: "anthropic",
    label: "Claude Fable 5 via the Claude CLI",
    binary: "claude",
    model: "anthropic/claude-fable-5",
    subjectId: "claude-fable-5",
    effort: null,
    command: ["claude", "--model", "fable", "-p", "{instruction}", "--permission-mode", "bypassPermissions"],
    invocationNote:
      "As `claude-sonnet`, with `--model fable`. Declared and not yet run; it is here so the completion report can name it as an available next subject rather than describing one in prose.",
    siblingModel: true,
  },
  {
    id: "codex",
    family: "openai",
    label: "GPT-5.6 Sol via the Codex CLI",
    binary: "codex",
    model: "openai/gpt-5.6-sol",
    subjectId: "gpt-5.6-sol",
    effort: null,
    command: [
      "codex",
      "exec",
      "--dangerously-bypass-approvals-and-sandbox",
      "--skip-git-repo-check",
      "{instruction}",
    ],
    invocationNote:
      "`exec` is non-interactive. The approval bypass is the same requirement as Claude's; `--skip-git-repo-check` is needed because the sandbox is a bare temp directory rather than a repository. `-m` was probed against five other model ids and every one returned `not supported when using Codex with a ChatGPT account`, so this provider contributes exactly one subject.",
    siblingModel: false,
  },
  {
    id: "gemini",
    family: "google",
    label: "Gemini via the Gemini CLI",
    binary: "gemini",
    model: "google/gemini-3-pro",
    subjectId: "gemini-3-pro",
    effort: null,
    command: ["gemini", "--approval-mode", "yolo", "-p", "{instruction}"],
    invocationNote:
      "`-p` is headless. `--approval-mode yolo` auto-approves tool calls, which is the equivalent of the other two providers' bypass flags and is confined to the throwaway sandbox. The binary is present and answers `--version`; authentication fails with `IneligibleTierError`, which is an account entitlement rather than a model result and counts for nothing.",
    siblingModel: false,
  },
  {
    id: "external",
    family: "external",
    label: "Run elsewhere and imported",
    binary: null,
    model: "external/unspecified",
    subjectId: "external",
    effort: null,
    command: null,
    invocationNote:
      "No CLI. `foundry trials campaign prepare` emits the bundle and the exact instruction; the result is imported with `foundry trials campaign import`, and the challenge hash decides whether it counts.",
    siblingModel: false,
  },
];

export const providerById = (id: string): ProviderSpec => {
  const found = PROVIDERS.find((p) => p.id === id);
  if (found === undefined) {
    throw new Error(`unknown provider "${id}"; known providers are ${PROVIDERS.map((p) => p.id).join(", ")}`);
  }
  return found;
};

export interface ProviderAvailability {
  readonly provider: ProviderSpec;
  readonly available: boolean;
  readonly state: "configured" | "unavailable" | "entitlement-blocked" | "not-installed" | "import-only";
  /** Version string when the binary answered, or the reason it did not. */
  readonly detail: string;
}

/**
 * Is this provider runnable on this machine, right now?
 *
 * Executed rather than assumed. A campaign that assumes a CLI exists produces a crashed trial with a
 * useless transcript; one that checks produces a NOT_RUN slot, a prepared bundle and an instruction
 * someone can run on a machine that does have it.
 */
export function checkProvider(spec: ProviderSpec): ProviderAvailability {
  if (spec.binary === null) {
    return {
      provider: spec,
      available: false,
      state: "import-only",
      detail: "external by declaration: prepare a bundle and import the result",
    };
  }
  if (spec.family === "anthropic") {
    if ((process.env["CLAUDE_CODE_OAUTH_TOKEN"] ?? "").trim().length === 0) {
      return {
        provider: spec,
        available: false,
        state: "import-only",
        detail:
          "Anthropic execution requires an explicit CLAUDE_CODE_OAUTH_TOKEN in the runner environment; defaulting to import-only so prepared bundles cannot spend tokens accidentally",
      };
    }
  }
  try {
    const out = execFileSync(spec.binary, ["--version"], {
      encoding: "utf8",
      timeout: 20_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (spec.family === "google") {
      return {
        provider: spec,
        available: false,
        state: "entitlement-blocked",
        detail: `${out.trim().split("\n")[0] ?? "present"}; entitlement previously blocked with IneligibleTierError, so this phase treats Gemini as import-only until a real authenticated run changes that`,
      };
    }
    return {
      provider: spec,
      available: true,
      state: "configured",
      detail: out.trim().split("\n")[0] ?? "present",
    };
  } catch (err) {
    const msg = (err as Error).message.split("\n")[0] ?? "";
    const lower = msg.toLowerCase();
    const entitlement =
      lower.includes("ineligibletiererror") ||
      lower.includes("quota") ||
      lower.includes("not entitled") ||
      lower.includes("unauthorized");
    return {
      provider: spec,
      available: false,
      state: entitlement ? "entitlement-blocked" : "not-installed",
      detail: `not runnable here: ${msg}`,
    };
  }
}

export const checkAllProviders = (): readonly ProviderAvailability[] => PROVIDERS.map(checkProvider);

/** Substitute the instruction into a provider's argv template. */
export function buildCommand(spec: ProviderSpec, instruction: string): readonly string[] | null {
  if (spec.command === null) return null;
  return spec.command.map((arg) => (arg === "{instruction}" ? instruction : arg));
}

/**
 * Distinct provider FAMILIES among a set of subject ids — the number a transfer claim may quote.
 *
 * The subject count and the lab count diverge the moment a second model is added on a CLI that
 * already has one, and they answer different questions. Four Anthropic models give a bank of four
 * subjects and evidence about one lab; two labs give weaker width and stronger transfer. A report
 * that quotes whichever is larger is not reporting, it is choosing.
 */
export function providerFamiliesOf(subjectIds: readonly string[]): readonly ProviderFamily[] {
  const families = new Set<ProviderFamily>();
  for (const id of subjectIds) {
    const spec = PROVIDERS.find((p) => p.subjectId === id);
    if (spec !== undefined) families.add(spec.family);
  }
  return [...families].sort();
}

/** Provider entries that could produce a subject here: a real CLI, and a model it can actually host. */
export const runnableProviders = (): readonly ProviderSpec[] =>
  PROVIDERS.filter((p) => p.binary !== null && p.command !== null);
