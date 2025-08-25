import { getAdminSupabase } from '@/lib/supabaseClient'
import { registry as staticRegistry, type ProviderDescriptor } from '@/lib/providerRegistry'

export async function loadRegistryFromDb(): Promise<Record<string, ProviderDescriptor>> {
  const supabase = getAdminSupabase()
  if (!supabase) return staticRegistry
  try {
    const { data, error } = await supabase.from('providers').select('*').limit(500)
    if (error || !Array.isArray(data)) return staticRegistry
    const out: Record<string, ProviderDescriptor> = { ...staticRegistry }
    for (const r of data as any[]) {
      out[r.id] = {
        id: r.id,
        name: r.name || r.id,
        category: r.category || 'other',
        auth: (r.auth_type || 'apiKey') as any,
        required_secrets: Array.isArray(r.required_secrets) ? r.required_secrets : [],
      }
    }
    return out
  } catch { return staticRegistry }
}


