export interface ActionState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Echoed back so a failed submit does not wipe what the visitor typed. */
  values?: Record<string, string>;
  reference?: string;
}

export const emptyActionState: ActionState = { ok: false };

export function fieldErrors(error: unknown): Record<string, string> {
  if (error && typeof error === 'object' && 'errors' in error) {
    const raw = (error as { errors: unknown }).errors;
    if (raw && typeof raw === 'object') {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        out[k] = Array.isArray(v) ? String(v[0]) : String(v ?? '');
      }
      return out;
    }
  }
  return {};
}

/** Flattens a Zod error into a simple field -> message map. */
export function zodToErrors(error: { issues?: Array<{ path: PropertyKey[]; message: string }> }): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues ?? []) {
    const key = String(issue.path?.[0] ?? 'form');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function stringValue(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export function optionalNumber(value: string): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
