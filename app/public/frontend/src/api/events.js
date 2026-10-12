const API_BASE = 'http://fenix-portal.local/wp-json/wp/v2'
const SIGNUPS_API = 'http://fenix-portal.local/wp-json/fenix/v1/event-signups'

export async function fetchEvents() {
  const res = await fetch(`${API_BASE}/event`)
  if (!res.ok) throw new Error(`Failed to fetch events (${res.status})`)
  return res.json()
}

export async function createEventSignup(authHeader, eventId) {
  const res = await fetch(SIGNUPS_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      event_id: eventId
    })
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || `Signup failed (${res.status})`)
  }
  return res.json()
}

export async function deleteEventSignup(authHeader, signupId) {
  const res = await fetch(`${SIGNUPS_API}/${signupId}`, {
    method: 'DELETE',
    headers: { 'Authorization': authHeader }
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || `Could not cancel signup (${res.status})`)
  }
  return res.json()
}

export async function fetchEventSignups() {
  const res = await fetch(`${API_BASE}/event-signups`)
  if (!res.ok) throw new Error(`Failed to fetch signups (${res.status})`)
  return res.json()
}