// The simulated application, and the two ledgers that make the family gradable.
//
// The subject gets a frozen facade with eight methods and no way to read what it has done. The app
// keeps two records outside that facade:
//
//   effect ledger   which irreversible effects fired, in order, on which replay pass
//   call ledger     every facade call, including `askModel` — the one that is a rule violation
//
// The call ledger is what makes "no model in the loop" checkable. A subject that improvises its way
// through a mutated tree may well produce the right effects; it has still failed, and the failure is
// visible because the harness owns the channel it improvised through.

import type { EffectRecord, FacadeCall } from "./truth.js";
import type { AppFacade, QueryResult, Selector, UiNode } from "./types.js";

const walk = (node: UiNode): readonly UiNode[] => [node, ...node.children.flatMap(walk)];

/** Resolve a selector against a tree. Structural only — never by visible text. */
export function resolveSelector(tree: UiNode, selector: Selector): QueryResult {
  const all = walk(tree);
  const matches =
    selector.kind === "testid"
      ? all.filter((n) => n.attrs["data-testid"] === selector.value)
      : selector.kind === "attr"
        ? all.filter((n) => selector.qualifier !== null && n.attrs[selector.qualifier] === selector.value)
        : all.filter((n) => n.role === selector.value);

  if (selector.kind === "role_index") {
    const index = Number(selector.qualifier ?? "0");
    return { node: matches[index] ?? null, matches: matches.length, pending: false };
  }
  // More than one match is ambiguous. Returning the first would be exactly the guess the family is
  // built to punish, so the node is null and the count is reported.
  return {
    node: matches.length === 1 ? (matches[0] ?? null) : null,
    matches: matches.length,
    pending: false,
  };
}

export class App {
  private effectSeq = 0;
  private callSeq = 0;
  private readonly effects: EffectRecord[] = [];
  private readonly calls: FacadeCall[] = [];
  private replayIndex = 0;
  private confirmationOpen = false;
  private readonly typed = new Map<string, string>();

  constructor(
    private readonly tree: UiNode,
    private readonly confirmation: "absent" | "present" | "suppressed",
    private readonly asyncSettled: boolean,
  ) {}

  beginReplay(index: number): void {
    this.replayIndex = index;
    this.confirmationOpen = false;
  }

  private record(method: string, detail: string): void {
    this.callSeq += 1;
    this.calls.push({ seq: this.callSeq, method, detail, replayIndex: this.replayIndex });
  }

  facade(): AppFacade {
    return Object.freeze({
      query: (selector: Selector): QueryResult => {
        this.record("query", `${selector.kind}:${selector.value}`);
        // An unsettled async region resolves to nothing: the node is not there YET. A replayer that
        // treats "not found" as "gone" halts; one that waits and re-queries succeeds. Both are
        // legitimate; assuming it is present is not.
        const resolved = resolveSelector(this.tree, selector);
        // Pending means the node is THERE and not ready. Reporting pending for a selector that does
        // not resolve at all would mask a renamed attribute as a slow load, and the reference then
        // halts on a trace that actually needs re-recording.
        if (!this.asyncSettled && selector.value.includes("async") && resolved.node !== null) {
          return { node: null, matches: 0, pending: true };
        }
        return resolved;
      },
      attr: (nodeId: string, name: string): string | null => {
        this.record("attr", `${nodeId}.${name}`);
        return walk(this.tree).find((n) => n.id === nodeId)?.attrs[name] ?? null;
      },
      click: (nodeId: string): void => {
        this.record("click", nodeId);
        const node = walk(this.tree).find((n) => n.id === nodeId);
        if (node === undefined) throw new Error(`click on unknown node ${nodeId}`);
        if (node.attrs["data-opens-confirmation"] === "true" && this.confirmation === "present") {
          this.confirmationOpen = true;
        }
      },
      type: (nodeId: string, text: string): void => {
        this.record("type", `${nodeId}=${text}`);
        this.typed.set(nodeId, text);
      },
      submit: (nodeId: string): void => {
        this.record("submit", nodeId);
        const node = walk(this.tree).find((n) => n.id === nodeId);
        if (node === undefined) throw new Error(`submit on unknown node ${nodeId}`);
        this.effectSeq += 1;
        this.effects.push({
          seq: this.effectSeq,
          effect: node.attrs["data-effect"] ?? "submit",
          nodeId,
          replayIndex: this.replayIndex,
        });
      },
      confirmationPresent: (): boolean => {
        this.record("confirmationPresent", "");
        // `suppressed` is the interesting value: the dialog exists in the flow and is not shown, so
        // an implementation that treats "no dialog" as "confirmed" fires the irreversible step.
        return this.confirmation === "present" ? this.confirmationOpen : false;
      },
      acceptConfirmation: (): void => {
        this.record("acceptConfirmation", "");
        if (!this.confirmationOpen) throw new Error("no confirmation is presented");
        this.confirmationOpen = false;
      },
      askModel: (question: string): string => {
        this.record("askModel", question.slice(0, 60));
        return "try the button that looks right";
      },
    });
  }

  sealedEffects(): readonly EffectRecord[] {
    return [...this.effects];
  }

  sealedCalls(): readonly FacadeCall[] {
    return [...this.calls];
  }
}
