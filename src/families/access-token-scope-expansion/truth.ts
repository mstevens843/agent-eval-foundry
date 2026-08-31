import { ALLOWED_REASON, type DecisionReason } from "./spec.js";
import type {
  ApprovalRecord,
  RequestSurface,
  ResourceId,
  ScenarioView,
  TokenGrant,
  TokenRecord,
  TokenRequest,
  TokenScope,
} from "./types.js";

export const APPROVAL_DRIFTS = ["stable", "revoked", "superseded", "scope_reduced"] as const;
export type ApprovalDrift = (typeof APPROVAL_DRIFTS)[number];

export const TOKEN_DRIFTS = [
  "exact",
  "scope_expanded",
  "resource_expanded",
  "principal_changed",
  "revoked",
  "missing",
] as const;
export type TokenDrift = (typeof TOKEN_DRIFTS)[number];

export const CACHE_FRESHNESS = ["fresh", "stale"] as const;
export type CacheFreshness = (typeof CACHE_FRESHNESS)[number];

export interface ScenarioParams {
  readonly seed: 11 | 23 | 41 | 67;
  readonly approvalDrift: ApprovalDrift;
  readonly tokenDrift: TokenDrift;
  readonly cacheFreshness: CacheFreshness;
  readonly requestSurface: RequestSurface;
  readonly repeatCount: 1 | 2;
}

export interface ExpectedDecision {
  readonly allowed: boolean;
  readonly reason: DecisionReason;
  readonly requiredEffects: readonly string[];
  readonly forbiddenEffects: readonly string[];
}

export interface AuthorityCall {
  readonly seq: number;
  readonly attempt: number;
  readonly method: "currentApproval" | "currentToken" | "issueToken";
  readonly id: string;
  readonly actionId: string | null;
}

export interface EffectRecord {
  readonly seq: number;
  readonly attempt: number;
  readonly actionId: string;
  readonly grant: TokenGrant;
}

export interface Scenario {
  readonly id: string;
  readonly params: ScenarioParams;
  readonly view: Omit<ScenarioView, "attempt">;
  readonly currentApproval: ApprovalRecord | null;
  readonly currentToken: TokenRecord | null;
  readonly expected: ExpectedDecision;
}

export const BASE_APPROVAL: ApprovalRecord = {
  id: "approval-42",
  generation: 3,
  principal: "agent-bot",
  resource: "invoice-7",
  scope: "write:invoice",
  status: "active",
};

export const BASE_TOKEN: TokenRecord = {
  id: "token-42",
  generation: 3,
  principal: "agent-bot",
  resource: "invoice-7",
  scope: "write:invoice",
  status: "active",
};

const BASE_REQUEST: TokenRequest = {
  id: "grant-invoice-7",
  approvalId: BASE_APPROVAL.id,
  tokenId: BASE_TOKEN.id,
  approvalGeneration: BASE_APPROVAL.generation,
  principal: BASE_APPROVAL.principal,
  resource: BASE_APPROVAL.resource,
  scope: BASE_APPROVAL.scope,
  surface: "api",
};

export function grantFor(request: TokenRequest): TokenGrant {
  return {
    approvalId: request.approvalId,
    tokenId: request.tokenId,
    principal: request.principal,
    resource: request.resource,
    scope: request.scope,
  };
}

export function expectedEffectId(request: TokenRequest): string {
  return `grant:${request.id}:${request.approvalId}:${request.tokenId}`;
}

export function currentApprovalFor(drift: ApprovalDrift): ApprovalRecord | null {
  if (drift === "stable") return BASE_APPROVAL;
  if (drift === "revoked") return { ...BASE_APPROVAL, status: "revoked" };
  if (drift === "superseded")
    return { ...BASE_APPROVAL, generation: BASE_APPROVAL.generation + 1, status: "superseded" };
  return { ...BASE_APPROVAL, scope: "read:invoice" };
}

export function currentTokenFor(drift: TokenDrift): TokenRecord | null {
  if (drift === "exact") return BASE_TOKEN;
  if (drift === "missing") return null;
  if (drift === "scope_expanded") return { ...BASE_TOKEN, scope: "admin:invoice" };
  if (drift === "resource_expanded") return { ...BASE_TOKEN, resource: "invoice-*" };
  if (drift === "principal_changed") return { ...BASE_TOKEN, principal: "ops-bot" };
  return { ...BASE_TOKEN, status: "revoked" };
}

export function cachedApprovalFor(
  current: ApprovalRecord | null,
  freshness: CacheFreshness,
): ApprovalRecord | null {
  return freshness === "fresh" ? current : BASE_APPROVAL;
}

export function cachedTokenFor(current: TokenRecord | null, freshness: CacheFreshness): TokenRecord | null {
  return freshness === "fresh" ? current : BASE_TOKEN;
}

export function decideRequest(
  request: TokenRequest,
  approval: ApprovalRecord | null,
  token: TokenRecord | null,
): ExpectedDecision {
  if (
    approval === null ||
    approval.status !== "active" ||
    approval.generation !== request.approvalGeneration
  ) {
    return {
      allowed: false,
      reason: "ATS1_CURRENT_APPROVAL_REQUIRED",
      requiredEffects: [],
      forbiddenEffects: [expectedEffectId(request)],
    };
  }
  if (token === null || token.status !== "active") {
    return {
      allowed: false,
      reason: "ATS2_CURRENT_TOKEN_REQUIRED",
      requiredEffects: [],
      forbiddenEffects: [expectedEffectId(request)],
    };
  }
  if (request.scope !== approval.scope || token.scope !== approval.scope || token.scope !== request.scope) {
    return {
      allowed: false,
      reason: "ATS3_SCOPE_MUST_MATCH_APPROVAL",
      requiredEffects: [],
      forbiddenEffects: [expectedEffectId(request)],
    };
  }
  if (
    request.resource !== approval.resource ||
    token.resource !== approval.resource ||
    token.resource !== request.resource
  ) {
    return {
      allowed: false,
      reason: "ATS4_RESOURCE_MUST_MATCH_APPROVAL",
      requiredEffects: [],
      forbiddenEffects: [expectedEffectId(request)],
    };
  }
  if (
    request.principal !== approval.principal ||
    token.principal !== approval.principal ||
    token.principal !== request.principal
  ) {
    return {
      allowed: false,
      reason: "ATS5_PRINCIPAL_MUST_MATCH_APPROVAL",
      requiredEffects: [],
      forbiddenEffects: [expectedEffectId(request)],
    };
  }
  return {
    allowed: true,
    reason: ALLOWED_REASON,
    requiredEffects: [expectedEffectId(request)],
    forbiddenEffects: [],
  };
}

export function buildScenarioFromParts(params: ScenarioParams): Scenario {
  const currentApproval = currentApprovalFor(params.approvalDrift);
  const currentToken = currentTokenFor(params.tokenDrift);
  const request: TokenRequest = { ...BASE_REQUEST, surface: params.requestSurface };
  const id = [
    "ats",
    params.approvalDrift,
    params.tokenDrift,
    `cache-${params.cacheFreshness}`,
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
      cachedApproval: cachedApprovalFor(currentApproval, params.cacheFreshness),
      cachedToken: cachedTokenFor(currentToken, params.cacheFreshness),
    },
    currentApproval,
    currentToken,
    expected: decideRequest(request, currentApproval, currentToken),
  };
}

export function withAttempt(scenario: Scenario, attempt: number): ScenarioView {
  return { ...scenario.view, attempt };
}
