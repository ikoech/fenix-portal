const API_BASE = 'http://fenix-portal.local/wp-json/wp/v2'

export async function fetchTFADeals() {
  const res = await fetch(`${API_BASE}/tfa`)
  if (!res.ok) throw new Error(`Failed to fetch TFA deals (${res.status})`)
  return res.json()
}

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
        from_member: fromMemberId,
        to_member: toMemberId,
        deal_amount: amount
      }
    })
  })
  if (!res.ok) throw new Error(`Deal creation failed (${res.status})`)
  return res.json()
}