const FENIX_API = 'http://fenix-portal.local/wp-json/fenix/v1'

async function readResponse(res, failureMessage) {
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.message || `${failureMessage} (${res.status})`)
  }
  return data
}

export async function fetchMembers(authHeader) {
  if (!authHeader) throw new Error('Not logged in — please log in.')

  const members = []
  const perPage = 100
  let page = 1
  let totalPages = 1

  do {
    const res = await fetch(`${FENIX_API}/members?per_page=${perPage}&page=${page}`, {
      cache: 'no-store',
      headers: { Authorization: authHeader }
    })
    const data = await readResponse(res, 'Failed to fetch members')

    if (!Array.isArray(data)) {
      throw new Error('The members response was not a list.')
    }

    members.push(...data)

    const headerTotalPages = Number(res.headers.get('X-WP-TotalPages'))
    totalPages = Number.isInteger(headerTotalPages) && headerTotalPages > 0
      ? headerTotalPages
      : (data.length === perPage ? page + 1 : page)
    page += 1
  } while (page <= totalPages)

  return members
}

export async function updateMember(authHeader, userId, data) {
  if (!authHeader) throw new Error('Not logged in — please log in.')
  if (!userId) throw new Error('Could not identify the member to update.')

  const res = await fetch(`${FENIX_API}/users/${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader
    },
    body: JSON.stringify(data)
  })
  return readResponse(res, 'Failed to update member')
}

export async function deleteMember(authHeader, userId) {
  if (!authHeader) throw new Error('Not logged in — please log in.')

  const res = await fetch(`http://fenix-portal.local/wp-json/wp/v2/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: authHeader }
  })
  return readResponse(res, 'Failed to delete member')
}