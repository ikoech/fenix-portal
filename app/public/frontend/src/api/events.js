const API_BASE = 'http://fenix-portal.local/wp-json/wp/v2'

export async function fetchEvents() {
  const res = await fetch(`${API_BASE}/event`)
  if (!res.ok) throw new Error(`Failed to fetch events (${res.status})`)
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