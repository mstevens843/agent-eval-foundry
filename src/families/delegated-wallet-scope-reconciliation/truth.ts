import { ALLOWED_REASON, type DecisionReason } from "./spec.js";
import type {
  AuthorityStatus,
  DelegationRecord,
  RequestSurface,
  ScenarioView,
  SpendEffect,
  SpendEffectRequest,
  SpendRequest,
  SubjectAuthorityClaim,
  WalletId,
  WalletOwner,
  WalletPolicy,
  WalletToken,
} from "./types.js";

export const AUTHORITY_TRANSITIONS = ["stable", "downgraded", "revoked", "expired"] as const;
export type AuthorityTransition = (typeof AUTHORITY_TRANSITIONS)[number];

export const TOKEN_STATES = ["exact", "scope_broadened", "revoked", "wrong_delegate"] as const;
export type TokenState = (typeof TOKEN_STATES)[number];

export const CACHE_FRESHNESS = ["fresh", "stale", "stale_broader"] as const;
export type CacheFreshness = (typeof CACHE_FRESHNESS)[number];

export const PRIOR_SPEND_STATES = ["none", "some", "near_limit"] as const;
export type PriorSpendState = (typeof PRIOR_SPEND_STATES)[number];

export const POLICY_SOURCE_STATES = ["available", "policy_unavailable"] as const;
export type PolicySourceState = (typeof POLICY_SOURCE_STATES)[number];

export interface ScenarioParams {
  readonly seed: 11 | 23 | 41 | 67;
  readonly initialApprovedLimit: 50 | 100 | 250;
  readonly requestedAmount: 25 | 60 | 140 | 260;
  readonly authorityTransition: AuthorityTransition;
  readonly tokenState: TokenState;
  readonly cacheFreshness: CacheFreshness;
  readonly priorSpend: PriorSpendState;
  readonly policySource: PolicySourceState;
  readonly requestSurface: RequestSurface;
  readonly repeatCount: 1 | 2;
}

export interface ExpectedDecision {
  readonly allowed: boolean;
  readonly reason: DecisionReason;
  readonly allowedLimit: number | null;
  readonly remainingBudget: number | null;
  readonly requiredEffects: readonly string[];
  readonly forbiddenEffects: readonly string[];
}

export interface AuthorityCall {
  readonly seq: number;
  readonly attempt: number;
  readonly method:
    | "currentPolicy"
    | "currentDelegation"
    | "currentToken"
    | "remainingBudget"
    | "executeSpend";
  readonly id: string;
  readonly actionId: string | null;
}

export interface EffectRecord {
  readonly seq: number;
  readonly attempt: number;
  readonly actionId: string;
  readonly effect: SpendEffect;
}

export interface Scenario {
  readonly id: string;
  readonly params: ScenarioParams;
  readonly view: Omit<ScenarioView, "attempt">;
  readonly currentPolicy: WalletPolicy | null;
  readonly currentDelegation: DelegationRecord | null;
  readonly currentToken: WalletToken | null;
  readonly priorSpendAmount: number;
  readonly remainingBudget: number | null;
  readonly expected: ExpectedDecision;
}

const BASE_OBSERVED_AT = 100;

function ownerFor(seed: ScenarioParams["seed"]): WalletOwner {
  return seed === 23 || seed === 67 ? "owner-ravi" : "owner-alice";
}

function walletFor(seed: ScenarioParams["seed"]): WalletId {
  return seed === 41 || seed === 67 ? "wallet-beta" : "wallet-alpha";
}

function basePolicy(params: ScenarioParams): WalletPolicy {
  return {
    id: `policy-${walletFor(params.seed)}`,
    generation: 5,
    owner: ownerFor(params.seed),
    walletId: walletFor(params.seed),
    maxPerSpend: params.initialApprovedLimit,
    dailyLimit: params.initialApprovedLimit * 2,
    status: "active",
  };
}

function baseDelegation(params: ScenarioParams): DelegationRecord {
  return {
    id: `delegation-${walletFor(params.seed)}`,
    generation: 7,
    owner: ownerFor(params.seed),
    delegate: "wallet-agent",
    walletId: walletFor(params.seed),
    scope: "spend",
    maxPerSpend: params.initialApprovedLimit,
    expiresAt: BASE_OBSERVED_AT + 50,
    status: "active",
  };
}

function baseToken(params: ScenarioParams): WalletToken {
  const delegation = baseDelegation(params);
  return {
    id: `token-${walletFor(params.seed)}`,
    generation: delegation.generation,
    delegate: delegation.delegate,
    walletId: delegation.walletId,
    scope: "spend",
    maxPerSpend: delegation.maxPerSpend,
    issuedFromDelegationId: delegation.id,
    status: "active",
  };
}

function downgradedLimit(initial: ScenarioParams["initialApprovedLimit"]): number {
  if (initial === 50) return 25;
  if (initial === 100) return 50;
  return 100;
}

function statusForTransition(transition: AuthorityTransition): AuthorityStatus {
  if (transition === "revoked") return "revoked";
  if (transition === "expired") return "expired";
  return "active";
}

export function currentPolicyFor(params: ScenarioParams): WalletPolicy | null {
  if (params.policySource === "policy_unavailable") return null;
  return basePolicy(params);
}

export function currentDelegationFor(params: ScenarioParams): DelegationRecord | null {
  const base = baseDelegation(params);
  const maxPerSpend =
    params.authorityTransition === "downgraded"
      ? downgradedLimit(params.initialApprovedLimit)
      : base.maxPerSpend;
  return {
    ...base,
    status: statusForTransition(params.authorityTransition),
    maxPerSpend,
    expiresAt: params.authorityTransition === "expired" ? BASE_OBSERVED_AT - 1 : base.expiresAt,
  };
}

export function currentTokenFor(
  params: ScenarioParams,
  delegation: DelegationRecord | null,
): WalletToken | null {
  const base = baseToken(params);
  const token: WalletToken = {
    ...base,
    generation: delegation?.generation ?? base.generation,
    maxPerSpend: delegation?.maxPerSpend ?? base.maxPerSpend,
    issuedFromDelegationId: delegation?.id ?? base.issuedFromDelegationId,
  };
  if (params.tokenState === "exact") return token;
  if (params.tokenState === "scope_broadened") {
    return { ...token, scope: "admin", maxPerSpend: params.initialApprovedLimit * 3 };
  }
  if (params.tokenState === "wrong_delegate") return { ...token, delegate: "ops-agent" };
  return { ...token, status: "revoked" };
}

function priorSpendAmount(policy: WalletPolicy, state: PriorSpendState): number {
  if (state === "none") return 0;
  if (state === "some") return Math.floor(policy.dailyLimit / 4);
  return Math.max(0, policy.dailyLimit - Math.max(20, Math.floor(policy.maxPerSpend / 2)));
}

export function remainingBudgetFor(policy: WalletPolicy | null, priorSpend: number): number | null {
  if (policy === null) return null;
  return Math.max(0, policy.dailyLimit - priorSpend);
}

function broadenPolicy(policy: WalletPolicy): WalletPolicy {
  return {
    ...policy,
    maxPerSpend: policy.maxPerSpend * 3,
    dailyLimit: policy.dailyLimit * 3,
    status: "active",
  };
}

function broadenDelegation(delegation: DelegationRecord): DelegationRecord {
  return {
    ...delegation,
    scope: "admin",
    maxPerSpend: delegation.maxPerSpend * 3,
    expiresAt: BASE_OBSERVED_AT + 500,
    status: "active",
  };
}

function broadenToken(token: WalletToken): WalletToken {
  return {
    ...token,
    scope: "admin",
    maxPerSpend: token.maxPerSpend * 3,
    status: "active",
  };
}

function cachedPolicyFor(params: ScenarioParams, current: WalletPolicy | null): WalletPolicy | null {
  if (params.cacheFreshness === "fresh") return current;
  const base = basePolicy(params);
  return params.cacheFreshness === "stale_broader" ? broadenPolicy(base) : base;
}

function cachedDelegationFor(
  params: ScenarioParams,
  current: DelegationRecord | null,
): DelegationRecord | null {
  if (params.cacheFreshness === "fresh") return current;
  const base = baseDelegation(params);
  return params.cacheFreshness === "stale_broader" ? broadenDelegation(base) : base;
}

function cachedTokenFor(params: ScenarioParams, current: WalletToken | null): WalletToken | null {
  if (params.cacheFreshness === "fresh") return current;
  const base = baseToken(params);
  return params.cacheFreshness === "stale_broader" ? broadenToken(base) : base;
}

function subjectAuthorityClaimFor(
  params: ScenarioParams,
  policy: WalletPolicy,
): SubjectAuthorityClaim | null {
  if (params.cacheFreshness !== "stale_broader") return null;
  return {
    source: "subject-receipt",
    policyGeneration: policy.generation,
    delegationGeneration: baseDelegation(params).generation,
    tokenGeneration: baseToken(params).generation,
    maxPerSpend: params.initialApprovedLimit * 3,
    remainingBudget: policy.dailyLimit * 3,
    status: "claims-authorized",
  };
}

export function spendEffectFor(request: SpendRequest): SpendEffectRequest {
  return {
    policyId: request.policyId,
    delegationId: request.delegationId,
    tokenId: request.tokenId,
    owner: request.owner,
    delegate: request.delegate,
    walletId: request.walletId,
    amount: request.amount,
    idempotencyKey: request.idempotencyKey,
  };
}

export function expectedEffectId(request: SpendRequest): string {
  return `spend:${request.idempotencyKey}:${request.walletId}:${request.amount}`;
}

export function decideSpend(
  request: SpendRequest,
  policy: WalletPolicy | null,
  delegation: DelegationRecord | null,
  token: WalletToken | null,
  remainingBudget: number | null,
): ExpectedDecision {
  if (policy === null || policy.status !== "active") {
    return {
      allowed: false,
      reason: "DWS1_CURRENT_POLICY_REQUIRED",
      allowedLimit: null,
      remainingBudget,
      requiredEffects: [],
      forbiddenEffects: [expectedEffectId(request)],
    };
  }
  if (
    delegation === null ||
    delegation.status !== "active" ||
    delegation.generation !== request.delegationGeneration ||
    delegation.owner !== request.owner ||
    delegation.delegate !== request.delegate ||
    delegation.walletId !== request.walletId ||
    delegation.expiresAt <= request.observedAt
  ) {
    return {
      allowed: false,
      reason: "DWS2_CURRENT_DELEGATION_REQUIRED",
      allowedLimit: null,
      remainingBudget,
      requiredEffects: [],
      forbiddenEffects: [expectedEffectId(request)],
    };
  }
  if (
    token === null ||
    token.status !== "active" ||
    token.generation !== request.tokenGeneration ||
    token.generation !== delegation.generation ||
    token.delegate !== request.delegate ||
    token.walletId !== request.walletId ||
    token.issuedFromDelegationId !== delegation.id
  ) {
    return {
      allowed: false,
      reason: "DWS3_CURRENT_TOKEN_REQUIRED",
      allowedLimit: null,
      remainingBudget,
      requiredEffects: [],
      forbiddenEffects: [expectedEffectId(request)],
    };
  }
  if (request.requestedScope !== "spend" || delegation.scope !== "spend" || token.scope !== "spend") {
    return {
      allowed: false,
      reason: "DWS4_DELEGATION_SCOPE_REQUIRED",
      allowedLimit: null,
      remainingBudget,
      requiredEffects: [],
      forbiddenEffects: [expectedEffectId(request)],
    };
  }

  const allowedLimit = Math.min(policy.maxPerSpend, delegation.maxPerSpend, token.maxPerSpend);
  if (request.amount > allowedLimit) {
    return {
      allowed: false,
      reason: "DWS5_REQUEST_WITHIN_CURRENT_LIMIT",
      allowedLimit,
      remainingBudget,
      requiredEffects: [],
      forbiddenEffects: [expectedEffectId(request)],
    };
  }
  if (remainingBudget === null || request.amount > remainingBudget) {
    return {
      allowed: false,
      reason: "DWS6_REMAINING_BUDGET_REQUIRED",
      allowedLimit,
      remainingBudget,
      requiredEffects: [],
      forbiddenEffects: [expectedEffectId(request)],
    };
  }
  return {
    allowed: true,
    reason: ALLOWED_REASON,
    allowedLimit,
    remainingBudget,
    requiredEffects: [expectedEffectId(request)],
    forbiddenEffects: [],
  };
}

export function buildScenarioFromParts(params: ScenarioParams): Scenario {
  const base = basePolicy(params);
  const currentPolicy = currentPolicyFor(params);
  const currentDelegation = currentDelegationFor(params);
  const currentToken = currentTokenFor(params, currentDelegation);
  const priorSpend = priorSpendAmount(currentPolicy ?? base, params.priorSpend);
  const remainingBudget = remainingBudgetFor(currentPolicy, priorSpend);
  const request: SpendRequest = {
    id: `spend-${walletFor(params.seed)}-${params.requestedAmount}`,
    policyId: base.id,
    delegationId: baseDelegation(params).id,
    tokenId: baseToken(params).id,
    delegationGeneration: baseDelegation(params).generation,
    tokenGeneration: baseToken(params).generation,
    owner: base.owner,
    delegate: "wallet-agent",
    walletId: base.walletId,
    requestedScope: params.tokenState === "scope_broadened" ? "admin" : "spend",
    amount: params.requestedAmount,
    observedAt: BASE_OBSERVED_AT,
    idempotencyKey: `idem-${params.seed}-${params.requestedAmount}-${params.requestSurface}`,
    surface: params.requestSurface,
  };
  const id = [
    "dws",
    `limit-${params.initialApprovedLimit}`,
    `amount-${params.requestedAmount}`,
    params.authorityTransition,
    params.tokenState,
    `cache-${params.cacheFreshness}`,
    `prior-${params.priorSpend}`,
    params.policySource,
    params.requestSurface,
    `r${params.repeatCount}`,
    params.seed,
  ].join("-");

  return {
    id,
    params,
    view: {
      id,
      request,
      cachedPolicy: cachedPolicyFor(params, currentPolicy),
      cachedDelegation: cachedDelegationFor(params, currentDelegation),
      cachedToken: cachedTokenFor(params, currentToken),
      subjectAuthorityClaim: subjectAuthorityClaimFor(params, base),
    },
    currentPolicy,
    currentDelegation,
    currentToken,
    priorSpendAmount: priorSpend,
    remainingBudget,
    expected: decideSpend(request, currentPolicy, currentDelegation, currentToken, remainingBudget),
  };
}

export function withAttempt(scenario: Scenario, attempt: number): ScenarioView {
  return { ...scenario.view, attempt };
}
