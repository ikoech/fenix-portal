import { WP_API as API_BASE, FENIX_API } from './config.js'

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

async function guestApprovalRequest(authHeader, path, options = {}) {
  if (!authHeader) throw new Error('Din session har gått ut. Logga in igen.')

  const res = await fetch(`${FENIX_API}/guests/${path}`, {
    ...options,
    headers: { Authorization: authHeader }
  })
  if (!res.ok) {
    const error = await res.json().catch(() => null)
    throw new Error(error?.message || `Begäran misslyckades (${res.status})`)
  }
  return res.json()
}

export async function getPendingGuests(authHeader, signal) {
  const guests = await guestApprovalRequest(authHeader, 'pending', { cache: 'no-store', signal })
  if (!Array.isArray(guests)) throw new Error('Svaret innehöll inte en gästlista.')
  return guests
}

export function approveGuest(authHeader, guestId) {
  return guestApprovalRequest(authHeader, `${encodeURIComponent(guestId)}/approve`, { method: 'POST' })
}

export function rejectGuest(authHeader, guestId) {
  return guestApprovalRequest(authHeader, `${encodeURIComponent(guestId)}/reject`, { method: 'POST' })
}