const API_BASE = 'http://fenix-portal.local/wp-json/wp/v2'

export async function fetchSeekingPosts() {
  const res = await fetch(`${API_BASE}/seeking`)
  if (!res.ok) throw new Error(`Failed to fetch seeking posts (${res.status})`)
  return res.json()
}

export async function createSeekingPost(authHeader, description, category) {
  const res = await fetch(`${API_BASE}/seeking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      title: `Seeking: ${category}`,
      status: 'publish',
      acf: {
        description: description,
        category: category,
        active: true
      }
    })
  })
  if (!res.ok) throw new Error(`Seeking post creation failed (${res.status})`)
  return res.json()
}