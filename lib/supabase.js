import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local.'
  )
}

// Shared options: disable auth persistence since this app uses no login system,
// which eliminates unnecessary localStorage reads and token-refresh network calls.
const BASE_OPTIONS = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
}

// Read-only client (no write header) — used for selects and subscriptions.
// eventsPerSecond throttles realtime delivery to avoid flooding slow connections.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  ...BASE_OPTIONS,
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

// Write client — includes the password header so upserts pass the RLS policy.
// Created lazily after the user enters the correct password.
let _writeClient = null
function getWriteClient() {
  if (!_writeClient) {
    _writeClient = createClient(supabaseUrl, supabaseAnonKey, {
      ...BASE_OPTIONS,
      global: {
        headers: { 'x-write-password': process.env.NEXT_PUBLIC_WRITE_PASSWORD },
      },
    })
  }
  return _writeClient
}

// ── Rate Limiter ─────────────────────────────────────────────────────────────
// Max 5 write requests per 60-second sliding window
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60 * 1000

const writeTimestamps = []

function checkRateLimit() {
  const now = Date.now()
  // Remove timestamps older than the window
  while (writeTimestamps.length > 0 && writeTimestamps[0] <= now - RATE_LIMIT_WINDOW_MS) {
    writeTimestamps.shift()
  }
  if (writeTimestamps.length >= RATE_LIMIT_MAX) {
    const oldestInWindow = writeTimestamps[0]
    const waitSec = Math.ceil((oldestInWindow + RATE_LIMIT_WINDOW_MS - now) / 1000)
    return { allowed: false, waitSec }
  }
  writeTimestamps.push(now)
  return { allowed: true, waitSec: 0 }
}

// ── Password Gate ────────────────────────────────────────────────────────────
// Simple gate to prevent casual/accidental writes from unauthorized visitors.
// Anyone can READ — only people with the group password can WRITE.
const WRITE_PASSWORD = process.env.NEXT_PUBLIC_WRITE_PASSWORD

let sessionPassword = null

export function setSessionPassword(pw) {
  sessionPassword = pw
}

export function getSessionPassword() {
  return sessionPassword
}

export function isPasswordCorrect(pw) {
  return pw === WRITE_PASSWORD
}

export function isWriteUnlocked() {
  return sessionPassword === WRITE_PASSWORD
}

// ── Storage API ──────────────────────────────────────────────────────────────
// Uses a single Supabase table: trip_data(key text PK, value text, updated_at timestamptz)
export const storage = {
  // Read — always allowed (no password, no rate limit).
  // Retries once on network error to handle transient Vercel/Supabase cold starts.
  async get(key) {
    const attempt = async () => supabase
      .from('trip_data')
      .select('value')
      .eq('key', key)
      .single()

    let { data, error } = await attempt()

    if (error && error.message && !data) {
      // One retry for transient network/cold-start failures
      ;({ data, error } = await attempt())
    }

    if (error || !data) return null
    return { value: data.value }
  },

  // Write — requires password + rate limit
  async set(key, value) {
    // Check password
    if (!isWriteUnlocked()) {
      console.error('storage.set blocked: write password not set')
      return { error: 'PASSWORD_REQUIRED' }
    }

    // Check rate limit
    const rl = checkRateLimit()
    if (!rl.allowed) {
      console.warn(`storage.set rate-limited: wait ${rl.waitSec}s`)
      return { error: 'RATE_LIMITED', waitSec: rl.waitSec }
    }

    // Check payload size (enforce <500KB client-side too)
    if (typeof value === 'string' && value.length >= 500000) {
      console.error('storage.set blocked: payload too large')
      return { error: 'PAYLOAD_TOO_LARGE' }
    }

    const { error } = await getWriteClient()
      .from('trip_data')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) {
      console.error('storage.set error:', error)
      return { error: 'DB_ERROR' }
    }
    return { error: null }
  },

  // Subscribe to realtime changes for a key — always allowed (read-only)
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
