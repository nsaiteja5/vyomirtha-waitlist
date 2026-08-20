const databaseUrl = (import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://vyomirtha-default-rtdb.asia-southeast1.firebasedatabase.app').replace(/\/$/, '')
const foundingPath = 'foundingAccess'

function databasePath(path) {
  return `${databaseUrl}/${path}.json`
}

function clean(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined))
}

async function firebaseRequest(path, options = {}) {
  const response = await fetch(databasePath(path), options)
  if (!response.ok) throw new Error('We could not save your details. Please try again.')
  return response
}

async function emailKey(email) {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase())
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function toFoundingAccess(value) {
  if (!value || !Number.isFinite(Number(value.totalSeats))) return null
  const totalSeats = Number(value.totalSeats)
  const claimedSeats = Object.keys(value.claims || {}).length
  return { totalSeats, claimedSeats, remainingSeats: Math.max(0, totalSeats - claimedSeats) }
}

export async function getFoundingAccess() {
  const response = await firebaseRequest(foundingPath)
  return toFoundingAccess(await response.json())
}

export function subscribeToFoundingAccess(onChange, onError) {
  const stream = new EventSource(databasePath(foundingPath))
  const receive = async (event) => {
    try {
      JSON.parse(event.data)
      onChange(await getFoundingAccess())
    } catch {
      onError?.()
    }
  }
  stream.addEventListener('put', receive)
  stream.addEventListener('patch', receive)
  stream.onerror = () => onError?.()
  return () => stream.close()
}

async function save(path, payload) {
  await firebaseRequest(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clean({ ...payload, createdAt: new Date().toISOString() })),
  })
}

export async function claimFoundingAccess(payload) {
  const claimKey = await emailKey(payload.email)

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await firebaseRequest(foundingPath, { headers: { 'X-Firebase-ETag': 'true' } })
    const value = await response.json()
    const access = toFoundingAccess(value)
    if (!access) throw new Error('Founding Access is not configured yet. Please try again shortly.')

    const claims = value.claims || {}
    const existingClaim = claims[claimKey]
    if (!existingClaim && access.remainingSeats === 0) throw new Error('All Founding Access seats have been claimed.')

    const nextValue = {
      ...value,
      claims: {
        ...claims,
        [claimKey]: existingClaim || clean({
          name: payload.name,
          company: payload.company,
          email: payload.email,
          service: payload.service,
          icp: payload.icp,
          source: payload.source,
          claimedAt: new Date().toISOString(),
        }),
      },
      updatedAt: new Date().toISOString(),
    }
    const update = await fetch(databasePath(foundingPath), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'if-match': response.headers.get('etag') || '*' },
      body: JSON.stringify(nextValue),
    })
    if (update.status === 412) continue
    if (!update.ok) throw new Error('We could not reserve your Founding Access seat. Please try again.')

    const updatedAccess = toFoundingAccess(nextValue)
    return { ...updatedAccess, seatNumber: existingClaim ? access.claimedSeats : updatedAccess.claimedSeats }
  }

  throw new Error('Someone else claimed a seat at the same time. Please try again.')
}

export async function joinWaitlist(payload) {
  if (payload.source === 'founding-access-submission') return claimFoundingAccess(payload)
  await save('waitlist/free', payload)
  return null
}

export async function sendContact({ name, email, message }) {
  await save('contacts', { name, email, message, source: 'contact-form' })
}
