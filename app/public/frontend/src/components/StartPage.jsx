import { useEffect, useState } from 'react'
import { fetchEventSignupSummary } from '../api/events'
import '../css/StartPage.css'

const API = 'http://fenix-portal.local/wp-json/wp/v2'

const fmtKr = n => new Intl.NumberFormat('sv-SE').format(n) + ' kr'

/** ACF date picker returns compact "Ymd" e.g. "20261103" → parse manually */
function parseAcfDate(ymd) {
  if (!ymd || typeof ymd !== 'string') return null
  const clean = ymd.replace(/[^0-9]/g, '')
  if (clean.length < 8) return null
  const y = +clean.slice(0, 4), m = +clean.slice(4, 6) - 1, d = +clean.slice(6, 8)
  const dt = new Date(y, m, d)
  return isNaN(dt) ? null : dt
}
/** Format ACF date to string */
const fmtDate = iso => {
  const d = parseAcfDate(iso)
  if (!d) return 'Inget datum'
  return d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })
}
/** Check if ACF date is within this week */
const isThisWeek = iso => {
  const d = parseAcfDate(iso)
  if (!d) return false
  const now = new Date()
  const mon = new Date(now)
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 7)
  return d >= mon && d < sun
}
/** Start page component */
export default function StartPage({ user }) {
  const [stats, setStats] = useState({ members: null, week: null, attending: null, tfa: null })
  const [events, setEvents] = useState([])
  const [attendees, setAttendees] = useState([])
  const [counts, setCounts] = useState({})
  const [err, setErr] = useState(null)

  useEffect(() => {
    const auth = sessionStorage.getItem('fenix_auth')
    const headers = auth ? { Authorization: auth } : {}
    let live = true

    async function load() {
      try {
        // Member count via X-WP Total header
        const usersRes = await fetch(`${API}/users?per_page=1`, { headers })
        const memberCount = Number(usersRes.headers.get('X-WP-Total')) || 0

        // Events ascending by ACF date (client-side sort since meta isn't queryable)
        const evRes = await fetch(`${API}/event?per_page=20&_embed=1`, { headers })
        const evs = await evRes.json()
        evs.sort((a, b) => {
          const da = parseAcfDate(a.acf?.event_date)
          const db = parseAcfDate(b.acf?.event_date)
          if (!da) return 1
          if (!db) return -1
          return da - db
        })

        // TFA total sum deal_amount across all pages
        let tfa = 0, page = 1
        for (;;) {
        const res = await fetch(`${API}/tfa?per_page=100&page=${page}`, { headers })
        if (!res.ok) break
        const rows = await res.json()
        if (!Array.isArray(rows) || rows.length === 0) break
        tfa += rows.reduce((s, r) => {
            const raw = r.acf?.deal_amount
            if (raw == null) return s
            // Strip commas, spaces, and other non-digits except decimal point
            const num = Number(String(raw).replace(/[^0-9.]/g, ''))
            return s + (isNaN(num) ? 0 : num)
        }, 0)
        if (rows.length < 100) break
        page += 1
        }

        // Signup counts and attendees come from the custom signup summary endpoint
        const summary = await fetchEventSignupSummary(auth)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const next = evs.find(e => {
          const d = parseAcfDate(e.acf?.event_date)
          return d && d >= today
        }) ?? null

        const people = next ? (summary.attendees?.[next.id] ?? []) : []
        const nextCount = next ? Number(summary.counts[next.id]) || 0 : 0

        if (!live) return
        setEvents(evs)
        setCounts(summary.counts)
        setAttendees(people)
        setStats({
          members: memberCount,
          week: evs.filter(e => isThisWeek(e.acf?.event_date)).length,
          attending: nextCount,
          tfa,
        })
      } catch (e) {
        if (live) setErr(e.message)
      }
    }

    load()
    return () => { live = false }
  }, [])

  const cards = [
    { label: 'Medlemmar totalt', value: stats.members },
    { label: 'Veckans event', value: stats.week },
    { label: 'Kommande', value: stats.attending },
    { label: 'TFA totalt', value: stats.tfa !== null ? fmtKr(stats.tfa) : null },
  ]

  return (
    <div className="startpage">
      <section className="sp-hero">
        <h1>Hej, {user?.name} 👋</h1>
        <p>Välkommen till Fenix Medlemsportal</p>
      </section>

      {err && <p className="error-msg">{err}</p>}

      <section className="sp-stats">
        {cards.map(c => (
          <article className="stat-card" key={c.label}>
            <span className="stat-value">{c.value ?? '–'}</span>
            <span className="stat-label">{c.label}</span>
          </article>
        ))}
      </section>

      <div className="sp-grid">
        <section className="sp-panel">
          <h2>Kommande event</h2>
          {events.length === 0 && <p className="muted">Inga kommande event.</p>}
          <ul className="event-list">
            {events.slice(0, 5).map(ev => (
              <li key={ev.id}>
                <div>
                  <strong className="ev-title" dangerouslySetInnerHTML={{ __html: ev.title?.rendered ?? '' }} />
                  <small className="ev-meta">
                    {fmtDate(ev.acf?.event_date)}
                    {ev.acf?.event_time ? ` ${ev.acf.event_time}` : ''}
                    {ev.acf?.location ? ` · ${ev.acf.location}` : ''}
                  </small>
                </div>
                <span className="pill">
                  {Number(counts[ev.id]) || 0} deltagare
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="sp-panel">
          <h2>Kommer nästa event</h2>
          {attendees.length === 0 && <p className="muted">Inga anmälda än.</p>}
          <ul className="member-list">
            {attendees.map(m => (
              <li key={m.id}>
                {m.avatar_url && (
                  <img
                    className="avatar"
                    src={m.avatar_url}
                    alt=""
                    onError={e => { e.target.style.display = 'none' }}
                  />
                )}
                <span>{m.name}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}