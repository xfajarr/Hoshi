export class SafeguardError extends Error {
  readonly code: string;
  readonly detail: Record<string, unknown>;

  constructor(code: string, detail: Record<string, unknown> = {}) {
    super(code);
    this.name = 'SafeguardError';
    this.code = code;
    this.detail = detail;
  }
}