/**
 * Leaderboard API client.
 * Handles all communication with the Python backend and Firebase real-time subscriptions.
 */

const databaseUrl = (
  import.meta.env.VITE_FIREBASE_DATABASE_URL ||
  'https://vyomirtha-default-rtdb.asia-southeast1.firebasedatabase.app'
).replace(/\/$/, '')

const TOKEN_KEY = 'vyomirtha_xtoken'

/* ── Auth ── */

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function storeToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

function authHeaders() {
  const token = getStoredToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function parseUserFromToken(token) {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.exp && payload.exp * 1000 < Date.now()) return null
    return { id: payload.sub, name: payload.name, handle: payload.handle, avatar: payload.avatar }
  } catch { return null }
}

export function getCurrentUser() {
  return parseUserFromToken(getStoredToken())
}

export function getXAuthUrl() {
  return '/api/auth/x'
}

export function logout() {
  clearToken()
}

/* ── Leaderboard data ── */

export async function fetchLeaderboard() {
  const r = await fetch('/api/leaderboard/', { headers: authHeaders() })
  if (!r.ok) throw new Error('Failed to load leaderboard')
  return r.json()
}

export async function fetchConfig() {
  const r = await fetch('/api/leaderboard/config')
  if (!r.ok) return { showDemoProfiles: true, minBid: 10 }
  return r.json()
}

export async function fetchActivity() {
  const r = await fetch('/api/leaderboard/activity')
  if (!r.ok) return { activity: [] }
  return r.json()
}

export async function fetchUserProfile(userId) {
  const r = await fetch(`/api/leaderboard/user/${userId}`)
  if (!r.ok) return null
  return r.json()
}

/* ── Profile ── */

export async function updateProfile(data) {
  const r = await fetch('/api/leaderboard/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  if (r.status === 401) {
    clearToken()
    throw new Error('Your session expired. Please connect with X again.')
  }
  if (!r.ok) throw new Error('Failed to update profile')
  return r.json()
}

/* ── Payments ── */

export async function createOrder(amount) {
  const r = await fetch('/api/cashfree/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ amount }),
  })
  if (r.status === 401) {
    clearToken()
    throw new Error('Your session expired. Please connect with X again.')
  }
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create payment order')
  }
  return r.json()
}

export async function verifyPayment(orderId) {
  const r = await fetch(`/api/cashfree/verify-payment/${orderId}`, {
    headers: authHeaders(),
  })
  if (r.status === 401) {
    clearToken()
    throw new Error('Your session expired. Please connect with X again.')
  }
  if (!r.ok) throw new Error('Failed to verify payment')
  return r.json()
}

/* ── Real-time subscriptions (Firebase SSE) ── */

export function subscribeToLeaderboard(onChange, onError) {
  const stream = new EventSource(`${databaseUrl}/leaderboard/users.json`)
  const handle = async () => {
    try {
      const data = await fetchLeaderboard()
      onChange(data)
    } catch (e) { onError?.(e) }
  }
  stream.addEventListener('put', handle)
  stream.addEventListener('patch', handle)
  stream.onerror = () => onError?.(new Error('Connection lost'))
  // Initial fetch
  handle()
  return () => stream.close()
}

export function subscribeToActivity(onChange, onError) {
  const stream = new EventSource(`${databaseUrl}/leaderboard/activity.json`)
  const handle = async () => {
    try {
      const data = await fetchActivity()
      onChange(data)
    } catch (e) { onError?.(e) }
  }
  stream.addEventListener('put', handle)
  stream.addEventListener('patch', handle)
  stream.onerror = () => onError?.(new Error('Connection lost'))
  handle()
  return () => stream.close()
}
