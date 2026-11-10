import { useEffect, useState } from 'react'
import { fetchEvents, fetchEventSignupSummary } from '../api/events'
import { WP_API as API } from '../api/config'
import { parseEventDate as parseAcfDate, selectNextEvent, buildRosterPrintHtml } from '../utils/eventRoster'
import { getGuestStatus } from '../utils/guestStatus'
import '../css/GuestStatus.css'
import '../css/StartPage.css'

const fmtKr = n => new Intl.NumberFormat('sv-SE').format(n) + ' kr'

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
  const [currentEvent, setCurrentEvent] = useState(null)
  const [attendees, setAttendees] = useState([])
  const [cancelled, setCancelled] = useState([])
  const [counts, setCounts] = useState({})
  const [breakdown, setBreakdown] = useState({})
  const [err, setErr] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [today] = useState(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  })

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
        const evs = await fetchEvents()
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
        const next = selectNextEvent(evs, today)

        const people = next ? (summary.attendees?.[next.id] ?? []) : []
        const cancelledPeople = next ? (summary.cancelled?.[next.id] ?? []) : []
        const nextCount = next ? Number(summary.counts[next.id]) || 0 : 0

        if (!live) return
        setEvents([...evs].reverse())
        setCurrentEvent(next)
        setCounts(summary.counts)
        setBreakdown(summary.breakdown)
        setAttendees(people)
        setCancelled(cancelledPeople)
        setStats({
          members: memberCount,
          week: evs.filter(e => isThisWeek(e.acf?.event_date)).length,
          attending: nextCount,
          tfa,
        })
        setLoaded(true)
      } catch (e) {
        if (live) setErr(e.message)
      }
    }

    load()
    return () => { live = false }
  }, [today])

  const printSignupList = async () => {
    if (!currentEvent) return

    const titleDocument = new DOMParser().parseFromString(currentEvent.title?.rendered || 'Event', 'text/html')
    const title = titleDocument.documentElement.textContent || 'Event'
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      setErr('Utskriftsfönstret kunde inte öppnas. Tillåt popup-fönster och försök igen.')
      return
    }

    try {
      const summary = await fetchEventSignupSummary(sessionStorage.getItem('fenix_auth'))
      const eventDate = parseAcfDate(currentEvent.acf?.event_date)
      const printDate = eventDate ? eventDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Inget datum'
      printWindow.document.write(buildRosterPrintHtml(title, printDate,
        summary.attendees[currentEvent.id] || [], summary.cancelled[currentEvent.id] || []))
      printWindow.document.close()
      printWindow.focus()
      window.setTimeout(() => printWindow.print(), 250)
    } catch (e) {
      printWindow.close()
      setErr(e.message)
    }
  }

  const cards = [
    { label: 'Medlemmar totalt', value: stats.members },
    { label: 'Veckans event', value: stats.week },
    { label: 'Kommande', value: stats.attending },
    { label: 'TFA totalt', value: stats.tfa !== null ? fmtKr(stats.tfa) : null },
  ]
  const upcomingEvents = events.filter(event => {
    const date = parseAcfDate(event.acf?.event_date)
    return date && date >= today
  })

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
          {loaded && upcomingEvents.length === 0 && <p className="muted">Inga kommande event.</p>}
          <ul className="event-list">
            {upcomingEvents.slice(0, 5).map(ev => (
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
          <div className="signup-panel-header">
            <div>
              <h2>{currentEvent ? `Deltagare: ${currentEvent.title?.rendered?.replace(/<[^>]*>/g, '')}` : 'Deltagare'}</h2>
              {currentEvent && <p className="ev-meta">{fmtDate(currentEvent.acf?.event_date)}</p>}
            </div>
            {currentEvent && (
              <button className="download-signups" type="button" onClick={printSignupList}>
                Skriv ut / spara som PDF
              </button>
            )}
          </div>
          {loaded && !currentEvent && <p className="muted">Inga kommande event.</p>}
          {currentEvent && <p className="ev-meta">
            {attendees.filter(person => person.type === 'member' || person.status === 'active').length} aktiva deltagare · {breakdown[currentEvent.id]?.members || 0} medlemmar, {breakdown[currentEvent.id]?.guests || 0} gäster
          </p>}
          {currentEvent && attendees.length === 0 && <p className="muted">Inga anmälda än.</p>}
          {attendees.length > 0 && (
            <>
              <h3 className="signup-list-heading">Deltagare ({attendees.length})</h3>
              <ul className="member-list">
                {attendees.map(m => (
                  <li key={`${m.signup_id}-${m.type}-${m.id}`}>
                    {m.avatar_url && (
                      <img
                        className="avatar"
                        src={m.avatar_url}
                        alt=""
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    )}
                    <span>{m.name}<small className="roster-type">
                      {m.type === 'guest' ? <>Gäst inbjuden av {m.inviter_name} · <span className={getGuestStatus(m).className}>{getGuestStatus(m).label}</span></> : 'Medlem'}
                      {m.company ? ` · ${m.company}` : ''}
                      {m.email ? ` · ${m.email}` : ''}
                    </small></span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {cancelled.length > 0 && (
            <>
              <h3 className="signup-list-heading cancelled-heading">Avanmälda ({cancelled.length})</h3>
              <ul className="member-list cancelled-list">
                {cancelled.map(m => <li key={`${m.signup_id}-${m.type}-${m.id}`}>{m.name}{m.type === 'guest' ? ` · Gäst inbjuden av ${m.inviter_name}${m.email ? ` · ${m.email}` : ''}` : ' · Medlem'}</li>)}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  )
}