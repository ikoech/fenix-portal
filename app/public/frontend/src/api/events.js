import { WP_API as API_BASE, FENIX_API } from './config.js'
const SIGNUPS_API = `${FENIX_API}/event-signups`

export async function fetchEvents() {
  const events = []
  let page = 1
  let totalPages = 1
  do {
    const res = await fetch(`${API_BASE}/event?per_page=100&page=${page}&_embed=1`)
    if (!res.ok) throw new Error(`Failed to fetch events (${res.status})`)
    const data = await res.json()
    if (!Array.isArray(data)) throw new Error('The events response was not a list.')
    events.push(...data)
    const pages = Number(res.headers.get('X-WP-TotalPages'))
    totalPages = Number.isInteger(pages) && pages > 0 ? pages : (data.length === 100 ? page + 1 : page)
    page += 1
  } while (page <= totalPages)
  return events
}

export async function fetchEventSignupSummary(authHeader) {
  if (!authHeader) throw new Error('Not logged in — please log in.')

  const res = await fetch(SIGNUPS_API, {
    cache: 'no-store',
    headers: { Authorization: authHeader }
  })
  if (!res.ok) {
    const error = await res.json().catch(() => null)
    throw new Error(error?.message || `Failed to fetch signup summary (${res.status})`)
  }
  const summary = await res.json()
  if (!summary || typeof summary !== 'object' || !summary.counts || !summary.signupIds ||
      !summary.breakdown || !summary.attendees || !summary.cancelled) {
    throw new Error('The event signup summary response was invalid.')
  }
  return summary
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

async function guestRequest(authHeader, url, options) {
  if (!authHeader) throw new Error('Not logged in — please log in.')
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' }
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `Guest request failed (${res.status})`)
  return data
}

export function addEventGuest(authHeader, signupId, name) {
  return guestRequest(authHeader, `${SIGNUPS_API}/${signupId}/guests`, {
    method: 'POST', body: JSON.stringify({ name: name.trim() })
  })
}

export function removeEventGuest(authHeader, signupId, guestId) {
  return guestRequest(authHeader, `${SIGNUPS_API}/${signupId}/guests/${encodeURIComponent(guestId)}`, {
    method: 'DELETE'
  })
}

export async function fetchEventSignups(authHeader) {
  if (!authHeader) throw new Error('Not logged in — please log in.')

  const res = await fetch(`${API_BASE}/event-signups`, {
    headers: { Authorization: authHeader }
  })
  if (!res.ok) throw new Error(`Failed to fetch signups (${res.status})`)
  return res.json()
}