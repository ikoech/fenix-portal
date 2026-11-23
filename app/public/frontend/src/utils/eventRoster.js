import { getGuestStatus } from './guestStatus.js'

export function parseEventDate(value) {
  if (typeof value !== 'string' || !/^\d{4}(?:-?\d{2}){2}$/.test(value)) return null
  const clean = value.replace(/-/g, '')
  const year = Number(clean.slice(0, 4))
  const month = Number(clean.slice(4, 6)) - 1
  const day = Number(clean.slice(6, 8))
  const date = new Date(year, month, day)
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null
}

export function selectNextEvent(events, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return events
    .map(event => ({ event, date: parseEventDate(event.acf?.event_date) }))
    .filter(item => item.date && item.date >= today)
    .sort((a, b) => a.date - b.date)[0]?.event || null
}

const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

const escapeCsvCell = value => {
  let text = String(value ?? '')
  const first = text.search(/\S/)
  if (first >= 0 && '=+-@'.includes(text[first])) text = `${text.slice(0, first)}'${text.slice(first)}`
  return `"${text.replace(/"/g, '""')}"`
}

export function buildRosterCSV(title, date, attendees) {
  const headers = ['Event', 'Datum', 'Namn', 'Typ', 'Företag', 'E-post', 'Inbjuden av', 'Status']
  const rows = attendees
    .filter(person => person.type === 'member' || person.status === 'active')
    .map(person => [
      title,
      date,
      person.name,
      person.type === 'guest' ? 'Gäst' : 'Medlem',
      person.company,
      person.email,
      person.type === 'guest' ? person.inviter_name : '',
      person.type === 'guest' ? getGuestStatus(person).label : 'Anmäld'
    ])
  return '\uFEFF' + [headers, ...rows].map(row => row.map(escapeCsvCell).join(',')).join('\r\n')
}

export function downloadRosterCSV(title, date, attendees) {
  const blob = new Blob([buildRosterCSV(title, date, attendees)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const filename = title
    .toLocaleLowerCase('sv-SE')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'deltagarlista'
  link.href = url
  link.download = `${filename}_${date.replace(/\s+/g, '-')}.csv`
  link.hidden = true
  document.body.appendChild(link)
  try {
    link.click()
  } finally {
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export function buildRosterPrintHtml(title, date, active, cancelled) {
  const rows = [...active.map(person => ({
    ...person,
    printStatus: person.type === 'guest' ? getGuestStatus(person) : { label: 'Anmäld', className: 'status-active' }
  })), ...cancelled.map(person => ({ ...person, printStatus: { label: 'Avanmäld', className: 'status-cancelled' } }))]
    .map(person => `<tr><td>${escapeHtml(person.name)}</td><td>${person.type === 'guest' ? 'Gäst' : 'Medlem'}</td><td>${escapeHtml(person.company || '')}</td><td>${escapeHtml(person.email || '')}</td><td>${escapeHtml(person.inviter_name || '')}</td><td class="${person.printStatus.className}">${escapeHtml(person.printStatus.label)}</td><td>${escapeHtml(person.cancelled_at || '')}</td><td>${escapeHtml(person.cancelled_by || '')}</td></tr>`)
    .join('')
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><title>${escapeHtml(title)} - deltagarlista</title><style>
    body { font: 14px Arial, sans-serif; color: #222; margin: 32px; }
    h1 { margin: 0 0 8px; } .date { color: #555; margin-bottom: 24px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #bbb; padding: 8px 10px; text-align: left; }
    th { background: #f0f2f3; }
    .status-active { color: #1a7f37; } .status-cancelled { color: #6b7280; }
    .status-rejected { color: #b42318; }
    @media print {
      body { margin: 15mm; }
      body * { visibility: hidden; }
      .print-area, .print-area * { visibility: visible; }
      .print-area { position: absolute; left: 0; top: 0; width: 100%; }
      .no-print { display: none !important; }
    }
    </style></head><body><div class="print-area"><h1>${escapeHtml(title)}</h1><div class="date">${escapeHtml(date)}</div>
    <table><thead><tr><th>Namn</th><th>Typ</th><th>Företag</th><th>E-post</th><th>Inbjuden av</th><th>Status</th><th>Avanmäld datum</th><th>Avanmäld av</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>`
}
