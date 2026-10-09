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

export async function fetchUserProfile(authHeader) {
  const res = await fetch(`${API_BASE}/users/me`, {
    headers: { 'Authorization': authHeader }
  })
  if (!res.ok) throw new Error(`Failed to fetch profile (${res.status})`)
  return res.json()
}