const API_BASE = 'http://fenix-portal.local/wp-json/wp/v2'

export async function fetchAllWithCount(endpoint, authHeader) {
  const res = await fetch(`${API_BASE}/${endpoint}?per_page=100`, {
    headers: { 'Authorization': authHeader }
  })
  if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`)
  const data = await res.json()
  return data
}

export async function updateEvent(authHeader, eventId, data) {
  const res = await fetch(`${API_BASE}/event/${eventId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update event')
  return res.json()
}

export async function deleteEvent(authHeader, eventId) {
  const res = await fetch(`${API_BASE}/event/${eventId}`, {
    method: 'DELETE',
    headers: { 'Authorization': authHeader }
  })
  if (!res.ok) throw new Error('Failed to delete event')
  return res.json()
}