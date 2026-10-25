const API_BASE = 'http://fenix-portal.local/wp-json/wp/v2'
const JWT_API_BASE = 'http://fenix-portal.local/wp-json/jwt-auth/v1'

export function getAuthHeader(token) {
  return `Bearer ${token}`
}

async function readResponse(res, failureMessage) {
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.message || `${failureMessage} (${res.status})`)
  }
  return data
}

export async function login(identifier, password) {
  const tokenRes = await fetch(`${JWT_API_BASE}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: identifier,
      password
    })
  })
  const tokenData = await readResponse(tokenRes, 'Login failed')
  if (typeof tokenData?.token !== 'string' || !tokenData.token) {
    throw new Error('Login response did not include a JWT.')
  }

  const authHeader = getAuthHeader(tokenData.token)
  const user = await fetchUserProfile(authHeader)
  return { user, authHeader }
}

export async function fetchUserProfile(authHeader) {
  const res = await fetch(`${API_BASE}/users/me`, {
    headers: { 'Authorization': authHeader }
  })
  const user = await readResponse(res, 'Failed to fetch profile')
  if (!user || typeof user !== 'object' || typeof user.id !== 'number') {
    throw new Error('The profile response was invalid.')
  }
  return user
}