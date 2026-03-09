import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Storage API that mirrors the old window.storage interface
// Uses a single Supabase table: trip_data(key text PK, value text, updated_at timestamptz)
export const storage = {
  async get(key) {
    const { data, error } = await supabase
      .from('trip_data')
      .select('value')
      .eq('key', key)
      .single()
    if (error || !data) return null
    return { value: data.value }
  },

  async set(key, value) {
    const { error } = await supabase
      .from('trip_data')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) console.error('storage.set error:', error)
    return !error
  },

  // Subscribe to realtime changes for a key
  // Returns unsubscribe function
  subscribe(key, callback) {
    const channel = supabase
      .channel(`trip_data:${key}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_data', filter: `key=eq.${key}` },
        (payload) => {
          if (payload.new?.value !== undefined) {
            callback(payload.new.value)
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }
}
