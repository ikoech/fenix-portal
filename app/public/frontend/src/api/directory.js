import { FENIX_API } from './config.js'

export async function fetchMemberDirectory(authHeader) {
  if (!authHeader) throw new Error('Not logged in — please log in.')

  const res = await fetch(`${FENIX_API}/member-directory`, {
    cache: 'no-store',
    headers: { Authorization: authHeader }
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `Failed to fetch member directory (${res.status})`)
  if (!Array.isArray(data)) throw new Error('The member directory response was invalid.')
  return data
}

export function groupDirectoryRows(rows) {
  const members = []
  for (const row of rows) {
    if (row.type === 'member') {
      members.push({ ...row, guests: [] })
    } else if (row.type === 'guest' && members.length > 0) {
      members[members.length - 1].guests.push(row)
    } else {
      throw new Error('Medlemskatalogen innehåller en ogiltig radordning.')
    }
  }
  return members
}

export function filterMembers(members, query) {
  const q = String(query ?? '').trim().toLowerCase()
  if (!q) return members
  return members.filter(member => ['name', 'company', 'expertise', 'specific_search', 'deputy']
    .some(field => member[field]?.toLowerCase().includes(q)))
}

export function buildDirectoryCSV(rows) {
  const headers = ['Namn', 'Företag', 'Är bra på!', 'Ersättare', 'Specifika sök', 'Gästnamn', 'E-post', 'Inbjuden av']
  const escapeCell = value => {
    let text = String(value ?? '')
    let first = 0
    while (first < text.length && (text.charCodeAt(first) <= 32 || /\s/u.test(text[first]))) first += 1
    if ('=+-@'.includes(text[first]) && first < text.length) text = `'${text}`
    return `"${text.replace(/"/g, '""')}"`
  }
  const data = rows.map(row => row.type === 'guest'
    ? ['', '', '', '', '', row.guest_name ?? row.name, row.guest_email, row.invited_by]
    : [row.name, row.company, row.expertise, row.deputy, row.specific_search, '', '', ''])
  return '\uFEFF' + [headers, ...data].map(row => row.map(escapeCell).join(',')).join('\r\n')
}

export function downloadCSV(rows) {
  const blob = new Blob([buildDirectoryCSV(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `medlemskatalog_${new Date().toISOString().slice(0, 10)}.csv`
  link.hidden = true
  document.body.appendChild(link)
  try {
    link.click()
  } finally {
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
