const API_BASE = 'http://fenix-portal.local/wp-json/wp/v2'
// Fetch TFA deals from the API
export async function fetchTFADeals(authHeader) {
  const res = await fetch(`${API_BASE}/tfa?per_page=100&_embed`, {
    headers: authHeader ? { Authorization: authHeader } : {}
  })
  if (!res.ok) throw new Error(`Failed to fetch TFA deals (${res.status})`)
  return res.json()
}
// Create a new TFA deal
export async function createTFADeal(authHeader, fromMemberId, toMemberId, amount, description) {
  const res = await fetch(`${API_BASE}/tfa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      title: `${fromMemberId} → ${toMemberId}: ${amount}`,
      status: 'publish',
      acf: {
        from_member: fromMemberId,        // number
        to_member: toMemberId,            // number
        deal_amount: amount,              // number — plain integer now
        deal_description: description || ''
      }
    })
  })
  if (!res.ok) throw new Error(`Deal creation failed (${res.status})`)
  return res.json()
}