export interface Api {
  next(x: {}): Promise<{ channel: string; bytes: string } | null>;
  record(x: {
    row: {
      request: string;
      attempt: number | null;
      status: "ok" | "error" | "incomplete";
      data: string;
      error: null | { code: string; retryable: boolean };
    };
  }): Promise<{ stored: true } | { error: string }>;
}
export interface View {
  requests: string[];
  storage: string;
}
