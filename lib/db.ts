// Minimal in-memory + Supabase-ready data layer.
// Swap Map with Supabase client when SUPABASE_URL/KEY are set. RLS: always filter by tenant_id.
export const TENANT_SCOPE = "tenant_id";
export function scopeByTenant<T extends { tenant_id: string }>(rows: T[], tenant_id: string): T[] {
  return rows.filter((r) => r.tenant_id === tenant_id);
}
