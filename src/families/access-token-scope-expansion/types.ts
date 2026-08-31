export const TOKEN_SCOPES = ["read:invoice", "write:invoice", "admin:invoice"] as const;
export type TokenScope = (typeof TOKEN_SCOPES)[number];

export type DecisionReason =
  | "ALLOWED"
  | "ATS1_CURRENT_APPROVAL_REQUIRED"
  | "ATS2_CURRENT_TOKEN_REQUIRED"
  | "ATS3_SCOPE_MUST_MATCH_APPROVAL"
  | "ATS4_RESOURCE_MUST_MATCH_APPROVAL"
  | "ATS5_PRINCIPAL_MUST_MATCH_APPROVAL"
  | "ATS6_NO_DUPLICATE_GRANT"
  | "ATS7_AUDIT_CURRENT_EVIDENCE"
  | "ATS8_REPORT_MATCHES_LEDGER";

export const RESOURCE_IDS = ["invoice-7", "invoice-*", "customer-9"] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];

export const PRINCIPALS = ["agent-bot", "ops-bot"] as const;
export type PrincipalId = (typeof PRINCIPALS)[number];

export const REQUEST_SURFACES = ["api", "worker", "delegated"] as const;
export type RequestSurface = (typeof REQUEST_SURFACES)[number];

export const APPROVAL_STATUSES = ["active", "revoked", "superseded"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const TOKEN_STATUSES = ["active", "revoked"] as const;
export type TokenStatus = (typeof TOKEN_STATUSES)[number];

export interface ApprovalRecord {
  readonly id: string;
  readonly generation: number;
  readonly principal: PrincipalId;
  readonly resource: ResourceId;
  readonly scope: TokenScope;
  readonly status: ApprovalStatus;
}

export interface TokenRecord {
  readonly id: string;
  readonly generation: number;
  readonly principal: PrincipalId;
  readonly resource: ResourceId;
  readonly scope: TokenScope;
  readonly status: TokenStatus;
}

export interface TokenRequest {
  readonly id: string;
  readonly approvalId: string;
  readonly tokenId: string;
  readonly approvalGeneration: number;
  readonly principal: PrincipalId;
  readonly resource: ResourceId;
  readonly scope: TokenScope;
  readonly surface: RequestSurface;
}

export interface TokenGrant {
  readonly approvalId: string;
  readonly tokenId: string;
  readonly principal: PrincipalId;
  readonly resource: ResourceId;
  readonly scope: TokenScope;
}

export interface ScenarioView {
  readonly id: string;
  readonly attempt: number;
  readonly request: TokenRequest;
  readonly cachedApproval: ApprovalRecord | null;
  readonly cachedToken: TokenRecord | null;
}

export interface Decision {
  readonly actionId: string;
  readonly allowed: boolean;
  readonly reason: DecisionReason;
}

export interface AuditEvent {
  readonly seq: number;
  readonly actionId: string;
  readonly reason: DecisionReason | "OBSERVED";
  readonly observedApprovalId: string | null;
  readonly observedApprovalGeneration: number | null;
  readonly observedApprovalStatus: ApprovalStatus | null;
  readonly observedTokenId: string | null;
  readonly observedTokenGeneration: number | null;
  readonly observedTokenStatus: TokenStatus | null;
  readonly observedScope: TokenScope | null;
  readonly observedResource: ResourceId | null;
  readonly observedPrincipal: PrincipalId | null;
  readonly detail: string;
}

export interface SubjectReport {
  readonly decisions: readonly Decision[];
  readonly audit: readonly AuditEvent[];
}

export interface AuthorityFacade {
  currentApproval: (id: string) => ApprovalRecord | null;
  currentToken: (id: string) => TokenRecord | null;
  issueToken: (actionId: string, grant: TokenGrant) => { ok: boolean; effectId: string };
}

export interface Subject {
  readonly id: string;
  readonly label: string;
  run: (view: ScenarioView, authority: AuthorityFacade) => SubjectReport;
}
