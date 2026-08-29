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
      "`exec` is non-interactive. The approval bypass is the same requirement as Claude's; `--skip-git-repo-check` is needed because the sandbox is a bare temp directory rather than a repository.",
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
      "`-p` is headless. `--approval-mode yolo` auto-approves tool calls, which is the equivalent of the other two providers' bypass flags and is confined to the throwaway sandbox.",
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
    return { provider: spec, available: false, detail: "external by declaration: no local CLI" };
  }
  try {
    const out = execFileSync(spec.binary, ["--version"], {
      encoding: "utf8",
      timeout: 20_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { provider: spec, available: true, detail: out.trim().split("\n")[0] ?? "present" };
  } catch (err) {
    return {
      provider: spec,
      available: false,
      detail: `not runnable here: ${(err as Error).message.split("\n")[0]}`,
    };
  }
}

export const checkAllProviders = (): readonly ProviderAvailability[] => PROVIDERS.map(checkProvider);

/** Substitute the instruction into a provider's argv template. */
export function buildCommand(spec: ProviderSpec, instruction: string): readonly string[] | null {
  if (spec.command === null) return null;
  return spec.command.map((arg) => (arg === "{instruction}" ? instruction : arg));
}
