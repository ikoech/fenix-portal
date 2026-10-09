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

export async function fetchEvents() {
  const res = await fetch(`${API_BASE}/event`)
  if (!res.ok) throw new Error(`Failed to fetch events (${res.status})`)
  return res.json()
}
export function formatACFDate(dateStr) {
  if (!dateStr) return 'TBD'
  const date = String(dateStr)
  const ymd = date.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})$/)
  const dmy = date.match(/^(\d{2})[-/]?(\d{2})[-/]?(\d{4})$/)
  const isValidDate = (year, month, day) => {
    const parsedDate = new Date(Date.UTC(year, month - 1, day))
    return (
      parsedDate.getUTCFullYear() === year &&
      parsedDate.getUTCMonth() === month - 1 &&
      parsedDate.getUTCDate() === day
    )
  }
  const yearFirst =
    ymd && isValidDate(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]))
  const dayFirst =
    dmy && isValidDate(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]))
  if (!yearFirst && !dayFirst) return 'TBD'

  const [, y, m, d] = yearFirst
    ? ymd
    : [null, dmy[3], dmy[2], dmy[1]]

  const year = Number(y)
  const month = Number(m)
  const day = Number(d)

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${day} ${months[month - 1]} ${year}`
}

export async function fetchUserProfile(authHeader) {
  const res = await fetch(`${API_BASE}/users/me`, {
    headers: { 'Authorization': authHeader }
  })
  if (!res.ok) throw new Error(`Failed to fetch profile (${res.status})`)
  return res.json()
}
export async function createEventSignup(authHeader, memberId, eventId) {
  const today = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const res = await fetch(`${API_BASE}/event-signups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      title: `Signup for event ${eventId}`,
      status: 'publish',
      acf: {
        member_id: memberId,
        event_id: eventId,
        signup_date: today
      }
    })
  })
  if (!res.ok) throw new Error(`Signup failed (${res.status})`)
  return res.json()
}

export async function fetchEventSignups() {
  const res = await fetch(`${API_BASE}/event-signups`)
  if (!res.ok) throw new Error(`Failed to fetch signups (${res.status})`)
  return res.json()
}

export async function fetchMembers() {
  const res = await fetch(`${API_BASE}/users`)
  if (!res.ok) throw new Error(`Failed to fetch members (${res.status})`)
  return res.json()
}

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

export async function fetchSeekingPosts(dealId) {
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
//  Document Library
export async function fetchDocuments() {
  const res = await fetch(`${API_BASE}/documents`)
  if (!res.ok) throw new Error(`Failed to fetch documents (${res.status})`)
  return res.json()
}

export async function createDocument(authHeader, fileName, fileUrl, uploadDate, userId) {
  const res = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      title: fileName,
      status: 'publish',
      acf: {
        file_url: fileUrl,
        file_name: fileName,
        uploaded_by: userId || 1,
        upload_date: uploadDate
      }
    })
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Document creation failed: ${errorText}`)
  }
  return res.json()
}
// --- Admin ---

export async function fetchAllWithCount(endpoint, authHeader) {
  const res = await fetch(`${API_BASE}/${endpoint}?per_page=100`, {
    headers: { 'Authorization': authHeader }
  })
  if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`)
  const data = await res.json()
  return data
}