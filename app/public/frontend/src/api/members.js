const API_BASE = 'http://fenix-portal.local/wp-json/wp/v2'

export async function fetchMembers() {
  const res = await fetch(`${API_BASE}/users`)
  if (!res.ok) throw new Error(`Failed to fetch members (${res.status})`)
  return res.json()
}

export async function updateMember(authHeader, userId, data) {
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update member')
  return res.json()
}

export async function deleteMember(authHeader, userId) {
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'DELETE',
    headers: { 'Authorization': authHeader }
  })
  if (!res.ok) throw new Error('Failed to delete member')
  return res.json()
}