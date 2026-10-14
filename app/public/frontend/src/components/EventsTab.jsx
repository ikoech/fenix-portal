import { useState, useEffect } from 'react'
import { fetchEvents, createEventSignup, deleteEventSignup } from '../api/events'
import { formatACFDate } from '../utils/date'
import '../css/EventsTab.css'

function EventsTab({ user }) {
  const isAdmin = user?.id === 1 || user?.roles?.includes('administrator')
  const [events, setEvents] = useState([])
  const [search, setSearch] = useState('')
  const [signups, setSignups] = useState({})
  const [signupCounts, setSignupCounts] = useState({})
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

  const query = search.trim().toLowerCase()
  const filteredEvents = events.filter(event => {
    if (!query) return true

    return [
      event.title?.rendered,
      event.acf?.description,
      event.acf?.location,
      event.acf?.event_date,
      event.acf?.event_time
    ].some(value => String(value || '').toLowerCase().includes(query))
  })

  useEffect(() => {
    fetchEvents()
      .then(data => {
        const sorted = [...data].sort((a, b) => {
          const da = a.acf?.event_date || ''
          const db = b.acf?.event_date || ''
          return da.localeCompare(db) // YYYYMMDD strings sort correctly
        })
        setEvents(sorted)
        loadUserSignups()
      })
      .catch(err => setError(err.message))
  }, [user])

  // Load all signups and filter for the current user, also compute counts per event
  async function loadUserSignups() {
    try {
      const authHeader = sessionStorage.getItem('fenix_auth')
      const res = await fetch('http://fenix-portal.local/wp-json/wp/v2/event-signups?per_page=100', {
        headers: { 'Authorization': authHeader }
      })
      if (!res.ok) return
      const allSignups = await res.json()

      // Which events has THIS user signed up for?
      const map = {}
      allSignups
        .filter(s => s.acf?.member_id === user.id)
        .forEach(s => { map[s.acf.event_id] = true })
      setSignups(map)

      // How many sign-ups does EACH event have? (computed, not stored in WP)
      const counts = {}
      allSignups.forEach(s => {
        const id = s.acf?.event_id
        if (id) counts[id] = (counts[id] || 0) + 1
      })
      setSignupCounts(counts)
    } catch (err) {
      console.error('Failed to load signups:', err)
    }
  }

  // Handle user signing up for an event
  const handleSignup = async (eventId) => {
    setBusy(eventId)
    setError(null)
    try {
      const authHeader = sessionStorage.getItem('fenix_auth')
      await createEventSignup(authHeader, eventId)
      setSignups(prev => ({ ...prev, [eventId]: true }))
      setSignupCounts(prev => ({ ...prev, [eventId]: (prev[eventId] || 0) + 1 }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  // Handle user cancelling their signup for an event
  const handleCancelSignup = async (eventId) => {
    if (!window.confirm('Would you like to cancel your signup for this event?')) return
    setBusy(eventId)
    setError(null)
    try {
      const authHeader = sessionStorage.getItem('fenix_auth')
      // Filter client-side so it works regardless of REST meta-query setup
      const res = await fetch('http://fenix-portal.local/wp-json/wp/v2/event-signups?per_page=100', {
        headers: { 'Authorization': authHeader }
      })
      const all = await res.json()
      const matches = all.filter(s => s.acf?.event_id === eventId && s.acf?.member_id === user.id)
      if (!matches.length) throw new Error('No signup found to cancel')

      await deleteEventSignup(authHeader, matches[0].id)

      setSignups(prev => { const copy = { ...prev }; delete copy[eventId]; return copy })
      setSignupCounts(prev => ({ ...prev, [eventId]: Math.max(0, (prev[eventId] || 1) - 1) }))
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
      setFormMessage('Title and date are required.')
      return
    }

    try {
      const authHeader = sessionStorage.getItem('fenix_auth')
      const formattedDate = newDate.replace(/-/g, '') // "2026-12-01" → "20261201"
      const res = await fetch('http://fenix-portal.local/wp-json/wp/v2/event', {
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
            location: newLocation || 'TBD',
            max_attendees: newMaxAttendees || '',
            image_url: newImageUrl || '',
            description: newDescription || ''
          }
        })
      })
      if (!res.ok) throw new Error('Failed to create event')
      setFormMessage('Event created successfully!')
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
        (a.acf?.event_date || '').localeCompare(b.acf?.event_date || '')
      ))
      loadUserSignups()
    } catch (err) {
      setFormMessage('Creation failed: ' + err.message)
    }
  }

  // Helper to parse date string into parts for display
  function getDateParts(dateStr) {
    if (!dateStr) return { day: '?', month: 'TBD', year: '' }
    let y, m, d
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-')
      y = parts[0]; m = parts[1]; d = parts[2]
    } else if (dateStr.length >= 8) {
      y = dateStr.substring(0, 4); m = dateStr.substring(4, 6); d = dateStr.substring(6, 8)
    } else {
      return { day: '?', month: 'TBD', year: '' }
    }
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
    return { day: parseInt(d), month: months[parseInt(m) - 1], year: y }
  }

  return (
    <section className="events-section">
      <div className="events-header">
        <h2>Upcoming Events</h2>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="btn-create-event">
            {showForm ? 'Cancel' : '+ Create Event'}
          </button>
        )}
      </div>

      <div className="events-search">
        <input
          type="search"
          aria-label="Search events"
          placeholder="Search events by title, description, location, or date..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isAdmin && showForm && (
        <form onSubmit={handleCreateEvent} className="event-create-form">
          <h3>Create a New Event</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Title *</label>
              <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g., Annual Meeting" required />
            </div>
            <div className="form-group">
              <label>Date *</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Time</label>
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input type="text" value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="e.g., Stockholm, Sweden" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Max Attendees</label>
              <input type="number" value={newMaxAttendees} onChange={e => setNewMaxAttendees(e.target.value)} placeholder="e.g., 50" />
            </div>
            <div className="form-group">
              <label>Image URL</label>
              <input type="text" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Event description..."
                rows={3}
              />
            </div>
          </div>
          <button type="submit" className="btn-create">Create Event</button>
          {formMessage && <p className="form-message">{formMessage}</p>}
        </form>
      )}

      {error && <p className="error-msg">{error}</p>}

      {events.length === 0 ? (
        <p>No events found.</p>
      ) : filteredEvents.length === 0 ? (
        <p className="events-empty">No events match your search.</p>
      ) : (
        <div className="events-grid">
          {filteredEvents.map(event => {
            const dateParts = getDateParts(event.acf?.event_date)
            const isSignedUp = signups[event.id]
            const currentCount = signupCounts[event.id] || 0
            const maxNum = parseInt(event.acf?.max_attendees, 10)
            const isFull = !isNaN(maxNum) && currentCount >= maxNum
            const location = event.acf?.location || 'TBD'
            const maxAttendees = event.acf?.max_attendees || 'N/A'
            const eventTime = event.acf?.event_time || ''
            const imageUrl = event.acf?.image_url || null

            return (
              <article key={event.id} className="event-card">
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
                    Max Attendees: {maxAttendees} ({currentCount} signed up)
                  </p>
                  <p className="event-full-date">{formatACFDate(event.acf?.event_date)}</p>

                  {isSignedUp ? (
                    <div className="signed-up-row">
                      <span className="signed-up-badge">✓ Signed Up</span>
                      <button
                        className="btn-cancel-link"
                        disabled={busy === event.id}
                        onClick={() => handleCancelSignup(event.id)}
                      >
                        {busy === event.id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    </div>
                  ) : isFull ? (
                    <span className="event-full-badge">Event Full</span>
                  ) : (
                    <button
                      className="btn-signup"
                      disabled={busy === event.id}
                      onClick={() => handleSignup(event.id)}
                    >
                      {busy === event.id ? 'Signing up…' : 'Sign Up →'}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default EventsTab