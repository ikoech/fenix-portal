const API_BASE = 'http://fenix-portal.local/wp-json/wp/v2'

export function getAuthHeader(username, appPassword) {
    const combined = `${username}:${appPassword}`
    return 'Basic ' + btoa(combined)
}

export async function login(username, appPassword) {
  const res = await fetch(`${API_BASE}/users/me`, {
    method: 'GET',
    headers: {
      'Authorization': getAuthHeader(username, appPassword)
    }
  })
  if (!res.ok) throw new Error(`Login failed (${res.status})`)
  return res.json()
}

export async function fetchEvents() {
  const res = await fetch(`${API_BASE}/event`)
  if (!res.ok) throw new Error(`Failed to fetch events (${res.status})`)
  return res.json()
}
export function formatACFDate(dateStr) {
  if (!dateStr) return 'TBD'
  const y = dateStr.substring(0, 4)
  const m = dateStr.substring(4, 6)
  const d = dateStr.substring(6, 8)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`
}

export async function fetchUserProfile(authHeader) {
  const res = await fetch(`${API_BASE}/users/me`, {
    headers: { 'Authorization': authHeader }
  })
  if (!res.ok) throw new Error(`Failed to fetch profile (${res.status})`)
  return res.json()
}
export async function createEventSignup(authHeader, memberId, eventId) {
  const today = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const res = await fetch(`${API_BASE}/event-signups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      title: `Signup for event ${eventId}`,
      status: 'publish',
      acf: {
        member_id: memberId,
        event_id: eventId,
        signup_date: today
      }
    })
  })
  if (!res.ok) throw new Error(`Signup failed (${res.status})`)
  return res.json()
}

export async function fetchEventSignups() {
  const res = await fetch(`${API_BASE}/event-signups`)
  if (!res.ok) throw new Error(`Failed to fetch signups (${res.status})`)
  return res.json()
}

export async function fetchMembers() {
  const res = await fetch(`${API_BASE}/users`)
  if (!res.ok) throw new Error(`Failed to fetch members (${res.status})`)
  return res.json()
}
