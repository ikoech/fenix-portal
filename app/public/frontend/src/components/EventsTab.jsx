import { useState, useEffect } from 'react'
import { fetchEvents, fetchEventSignupSummary, createEventSignup, deleteEventSignup, addEventGuest, removeEventGuest } from '../api/events'
import { WP_API } from '../api/config'
import { formatACFDate } from '../utils/date'
import '../css/EventsTab.css'

function EventsTab({ user, onRequireLogin }) {
  const isAdmin = user?.id === 1 || user?.roles?.includes('administrator')
  const [events, setEvents] = useState([])
  const [search, setSearch] = useState('')
  const [signups, setSignups] = useState({})
  const [signupCounts, setSignupCounts] = useState({})
  const [breakdown, setBreakdown] = useState({})
  const [attendees, setAttendees] = useState({})
  const [guestNames, setGuestNames] = useState({})
  const [guestEmails, setGuestEmails] = useState({})
  const [guestCompanies, setGuestCompanies] = useState({})
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newMaxAttendees, setNewMaxAttendees] = useState('')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [newDescription, setNewDescription] = useState('')

  // WP returns title.rendered HTML-encoded (e.g. "Veckom&#246;te"), so decode before matching
  const normalize = value => {
    const doc = new DOMParser().parseFromString(String(value || ''), 'text/html')
    return (doc.documentElement.textContent || '').normalize('NFC').toLowerCase()
  }
  const query = normalize(search.trim())
  const filteredEvents = events.filter(event => {
    if (!query) return true

    return [
      event.title?.rendered,
      event.acf?.description,
      event.acf?.location,
      event.acf?.event_date,
      event.acf?.event_time
    ].some(value => normalize(value).includes(query))
  })

  useEffect(() => {
    let isCurrent = true

    async function loadEvents() {
      setError(null)
      try {
        const data = await fetchEvents()
        const sorted = [...data].sort((a, b) => {
          const da = a.acf?.event_date || ''
          const db = b.acf?.event_date || ''
          return db.localeCompare(da) // YYYYMMDD strings sort correctly
        })
        if (!isCurrent) return
        setEvents(sorted)

        if (!user) {
          setSignups({})
          setSignupCounts({})
          setBreakdown({})
          setAttendees({})
          return
        }

        const summary = await fetchEventSignupSummary(sessionStorage.getItem('fenix_auth'))
        if (!isCurrent) return
        setSignups(summary.signupIds)
        setSignupCounts(summary.counts)
        setBreakdown(summary.breakdown)
        setAttendees(summary.attendees)
      } catch (err) {
        if (isCurrent) setError(err.message)
      }
    }

    loadEvents()
    return () => { isCurrent = false }
  }, [user])

  const refreshSignups = async auth => {
    const summary = await fetchEventSignupSummary(auth)
    setSignups(summary.signupIds)
    setSignupCounts(summary.counts)
    setBreakdown(summary.breakdown)
    setAttendees(summary.attendees)
  }

  // Handle user signing up for an event
  const handleSignup = async (eventId) => {
    if (!user) {
      onRequireLogin()
      return
    }
    setBusy(eventId)
    setError(null)
    try {
      const authHeader = sessionStorage.getItem('fenix_auth')
      await createEventSignup(authHeader, eventId)
      await refreshSignups(authHeader)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  // Handle user cancelling their signup for an event
  const handleCancelSignup = async (eventId) => {
    if (!user) {
      onRequireLogin()
      return
    }
    if (!window.confirm('Vill du avboka din anmälan till detta event?')) return
    setBusy(eventId)
    setError(null)
    try {
      const authHeader = sessionStorage.getItem('fenix_auth')
      await deleteEventSignup(authHeader, signups[eventId])

      await refreshSignups(authHeader)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  const handleGuest = async (eventId, guestId) => {
    if (busy !== null) return
    const name = (guestNames[eventId] || '').trim()
    const email = (guestEmails[eventId] || '').trim()
    const company = (guestCompanies[eventId] || '').trim()
    if (!guestId && !name) {
      setError('Ange ett gästnamn.')
      return
    }
    if (!guestId && !email) {
      setError('Ange gästens e-postadress.')
      return
    }
    setBusy(eventId)
    setError(null)
    try {
      const auth = sessionStorage.getItem('fenix_auth')
      if (guestId) await removeEventGuest(auth, signups[eventId], guestId)
      else {
        await addEventGuest(auth, signups[eventId], name, email, company)
        setGuestNames(prev => ({ ...prev, [eventId]: '' }))
        setGuestEmails(prev => ({ ...prev, [eventId]: '' }))
        setGuestCompanies(prev => ({ ...prev, [eventId]: '' }))
      }
      await refreshSignups(auth)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  // Handle admin creating a new event
  const handleCreateEvent = async (e) => {
    e.preventDefault()
    setFormMessage('')
    if (!newTitle || !newDate) {
      setFormMessage('Titel och datum är obligatoriska.')
      return
    }

    try {
      const authHeader = sessionStorage.getItem('fenix_auth')
      const formattedDate = newDate.replace(/-/g, '') // "2026-12-01" → "20261201"
      const res = await fetch(`${WP_API}/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          title: newTitle,
          status: 'publish',
          acf: {
            event_date: formattedDate,
            event_time: newTime || '',
            location: newLocation || 'Ej bestämt',
            max_attendees: newMaxAttendees || '',
            image_url: newImageUrl || '',
            description: newDescription || ''
          }
        })
      })
      if (!res.ok) throw new Error('Kunde inte skapa eventet.')
      setFormMessage('Eventet har skapats!')
      setNewTitle('')
      setNewDate('')
      setNewTime('')
      setNewLocation('')
      setNewMaxAttendees('')
      setNewImageUrl('')
      setNewDescription('')
      setShowForm(false)
      // Reload events (sorted)
      const updated = await fetchEvents()
      setEvents([...updated].sort((a, b) =>
        (b.acf?.event_date || '').localeCompare(a.acf?.event_date || '')
      ))
    } catch (err) {
      setFormMessage('Kunde inte skapa eventet: ' + err.message)
    }
  }

  // Helper to parse date string into parts for display
  function getDateParts(dateStr) {
    if (!dateStr) return { day: '?', month: 'EJ FASTSTÄLLT', year: '' }
    let y, m, d
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-')
      y = parts[0]; m = parts[1]; d = parts[2]
    } else if (dateStr.length >= 8) {
      y = dateStr.substring(0, 4); m = dateStr.substring(4, 6); d = dateStr.substring(6, 8)
    } else {
      return { day: '?', month: 'EJ FASTSTÄLLT', year: '' }
    }
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
    return { day: parseInt(d), month: months[parseInt(m) - 1], year: y }
  }

  return (
    <section className="events-section">
      <div className="events-header">
        <h2>Kommande evenemang</h2>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="btn-create-event">
            {showForm ? 'Avbryt' : '+ Skapa evenemang'}
          </button>
        )}
      </div>

      <div className="events-search">
        <input
          type="search"
          aria-label="Sök evenemang"
          placeholder="Sök evenemang efter titel, beskrivning, plats eller datum..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isAdmin && showForm && (
        <form onSubmit={handleCreateEvent} className="event-create-form">
          <h3>Skapa ett nytt evenemang</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Titel *</label>
              <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="t.ex. Årsmöte" required />
            </div>
            <div className="form-group">
              <label>Datum *</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tid</label>
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Plats</label>
              <input type="text" value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="t.ex. Stockholm" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Max antal deltagare</label>
              <input type="number" value={newMaxAttendees} onChange={e => setNewMaxAttendees(e.target.value)} placeholder="t.ex. 50" />
            </div>
            <div className="form-group">
              <label>Bild-URL</label>
              <input type="text" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="form-group">
              <label>Beskrivning</label>
              <textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Beskrivning av evenemanget..."
                rows={3}
              />
            </div>
          </div>
          <button type="submit" className="btn-create">Skapa evenemang</button>
          {formMessage && <p className="form-message">{formMessage}</p>}
        </form>
      )}

      {error && <p className="error-msg">{error}</p>}

      {events.length === 0 ? (
        <p>Inga evenemang hittades.</p>
      ) : filteredEvents.length === 0 ? (
        <p className="events-empty">Inga evenemang matchar din sökning.</p>
      ) : (
        <div className="events-grid">
          {filteredEvents.map(event => {
            const dateParts = getDateParts(event.acf?.event_date)
            const isSignedUp = signups[event.id]
            const currentCount = signupCounts[event.id] || 0
            const eventBreakdown = breakdown[event.id] || { members: 0, guests: 0 }
            const myGuests = (attendees[event.id] || []).filter(person => person.type === 'guest' && person.signup_id === isSignedUp)
            const maxNum = parseInt(event.acf?.max_attendees, 10)
            const isFull = !isNaN(maxNum) && maxNum > 0 && currentCount >= maxNum
            const location = event.acf?.location || 'Ej bestämt'
            const maxAttendees = event.acf?.max_attendees || 'Ej angivet'
            const eventTime = event.acf?.event_time || ''
            const imageUrl = event.acf?.image_url || null

            return (
              <article key={event.id} className={`event-card${user && isSignedUp ? ' event-card--with-guests' : ''}`}>
                <div className="event-main">
                  <div className="event-date-badge">
                    <span className="event-day">{dateParts.day}</span>
                    <span className="event-month">{dateParts.month}</span>
                  </div>

                  <div className="event-image-wrap">
                    {imageUrl ? (
                      <img src={imageUrl} alt={event.title.rendered} className="event-image" />
                    ) : (
                      <div className="event-image-placeholder">
                        <span>FENIX</span>
                      </div>
                    )}
                  </div>

                  <div className="event-details">
                    <h3 className="event-title">{event.title.rendered}</h3>
                    {event.acf?.description && (
                      <p className="event-description">{event.acf.description}</p>
                    )}
                    {eventTime && <p className="event-time">🕐 {eventTime}</p>}
                    <p className="event-location">📍 {location}</p>
                    <p className="event-meta">
                      Max antal deltagare: {maxAttendees}{user ? ` · ${currentCount} deltagare · ${eventBreakdown.members} medlemmar, ${eventBreakdown.guests} gäster` : ''}
                    </p>
                    <p className="event-full-date">{formatACFDate(event.acf?.event_date)}</p>

                    {user && isSignedUp ? (
                      <div className="signed-up-row">
                        <span className="signed-up-badge">✓ Anmäld</span>
                        <button
                          className="btn-cancel-link"
                          disabled={busy === event.id}
                          onClick={() => handleCancelSignup(event.id)}
                        >
                          {busy === event.id ? 'Avbokar…' : 'Avboka'}
                        </button>
                      </div>
                    ) : isFull ? (
                      <span className="event-full-badge">Fullbokat</span>
                    ) : !user ? (
                      <button
                        className="btn-signup"
                        onClick={onRequireLogin}
                      >
                        Logga in för att anmäla dig →
                      </button>
                    ) : (
                      <button
                        className="btn-signup"
                        disabled={busy === event.id}
                        onClick={() => handleSignup(event.id)}
                      >
                        {busy === event.id ? 'Anmäler…' : 'Anmäl dig →'}
                      </button>
                    )}
                  </div>
                </div>
                {user && isSignedUp && (
                  <div className="event-guests">
                    <strong>Mina gäster</strong>
                    {myGuests.length > 0 && <ul>
                      {myGuests.map(guest => <li key={guest.id}>
                        <span>{guest.name}{guest.status === 'rejected' ? ' · Avvisad' : ''}{guest.company && ` · ${guest.company}`}{guest.email && ` · ${guest.email}`}</span>
                        <button type="button" className="btn-cancel-link" disabled={busy !== null} onClick={() => handleGuest(event.id, guest.id)}>Ta bort</button>
                      </li>)}
                    </ul>}
                    <form onSubmit={e => { e.preventDefault(); handleGuest(event.id) }}>
                      <label htmlFor={`guest-${event.id}`}>Gästnamn</label>
                      <input id={`guest-${event.id}`} required value={guestNames[event.id] || ''} maxLength={200} onChange={e => setGuestNames(prev => ({ ...prev, [event.id]: e.target.value }))} />
                      <label htmlFor={`guest-email-${event.id}`}>Gästens e-post</label>
                      <input id={`guest-email-${event.id}`} type="email" required maxLength={254} value={guestEmails[event.id] || ''} onChange={e => setGuestEmails(prev => ({ ...prev, [event.id]: e.target.value }))} />
                      <label htmlFor={`guest-company-${event.id}`}>Företag (valfritt)</label>
                      <input id={`guest-company-${event.id}`} maxLength={200} value={guestCompanies[event.id] || ''} onChange={e => setGuestCompanies(prev => ({ ...prev, [event.id]: e.target.value }))} />
                      <button className="btn-signup" disabled={busy !== null} type="submit">Lägg till gäst</button>
                    </form>
                    <small>Gästen läggs direkt till och räknas som en deltagare.</small>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default EventsTab