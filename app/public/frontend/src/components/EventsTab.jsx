import { useState, useEffect } from 'react'
import { fetchEvents, createEventSignup, formatACFDate } from '../api'
import '../css/EventsTab.css'

function EventsTab({ user }) {
  const [events, setEvents] = useState([])
  const [signups, setSignups] = useState({})
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newMaxAttendees, setNewMaxAttendees] = useState('')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [newDescription, setNewDescription] = useState('')

  useEffect(() => {
    fetchEvents()
      .then(data => {
        setEvents(data)
        loadUserSignups(data)
      })
      .catch(err => setError(err.message))
  }, [user])

  const loadUserSignups = async () => {
    try {
      const res = await fetch('http://fenix-portal.local/wp-json/wp/v2/event-signups')
      if (!res.ok) return
      const allSignups = await res.json()
      const userSignups = allSignups.filter(s => s.acf?.member_id === user.id)
      const map = {}
      userSignups.forEach(s => { map[s.acf.event_id] = true })
      setSignups(map)
    } catch (err) {
      console.error('Failed to load signups:', err)
    }
  }

  const handleSignup = async (eventId) => {
    try {
      const authHeader = sessionStorage.getItem('fenix_auth')
      await createEventSignup(authHeader, user.id, eventId)
      setSignups(prev => ({ ...prev, [eventId]: true }))
    } catch (err) {
      setError(err.message)
    }
  }

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
      // Reload events
      const updated = await fetchEvents()
      setEvents(updated)
      loadUserSignups()
    } catch (err) {
      setFormMessage('Creation failed: ' + err.message)
    }
  }

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
        <button onClick={() => setShowForm(!showForm)} className="btn-create-event">
          {showForm ? 'Cancel' : '+ Create Event'}
        </button>
      </div>

      {showForm && (
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
      ) : (
        <div className="events-grid">
          {events.map(event => {
            const dateParts = getDateParts(event.acf?.event_date)
            const isSignedUp = signups[event.id]
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
                  <p className="event-meta">Max Attendees: {maxAttendees}</p>
                  <p className="event-full-date">{formatACFDate(event.acf?.event_date)}</p>

                  {isSignedUp ? (
                    <span className="signed-up-badge">✓ Signed Up</span>
                  ) : (
                    <button onClick={() => handleSignup(event.id)} className="btn-signup">
                      Sign Up →
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