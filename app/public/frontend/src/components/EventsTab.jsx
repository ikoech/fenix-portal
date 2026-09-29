import { useState, useEffect } from 'react'
import { fetchEvents, createEventSignup, formatACFDate } from '../api'

function EventsTab({ user }) {
  const [events, setEvents] = useState([])
  const [signups, setSignups] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchEvents()
      .then(data => {
        setEvents(data)
        loadUserSignups(data)
      })
      .catch(err => setError(err.message))
  }, [user])

  // Load the user's signups for the events
  const loadUserSignups = async (eventList) => {
    try {
      const res = await fetch(`http://fenix-portal.local/wp-json/wp/v2/event-signups`)
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
  // Handle event signup
  const handleSignup = async (eventId) => {
    try {
      const authHeader = sessionStorage.getItem('fenix_auth')
      await createEventSignup(authHeader, user.id, eventId)
      setSignups(prev => ({ ...prev, [eventId]: true }))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section>
      <h2>Upcoming Events</h2>
      {error && <p className="error-msg">{error}</p>}
      {events.length === 0 ? (
        <p>No events found.</p>
      ) : (
        <ul className="event-list">
          {events.map(event => (
            <li key={event.id} className="event-card">
              <h3>{event.title.rendered}</h3>
              <p><strong>Date:</strong> {formatACFDate(event.acf?.event_date)}</p>
              <p><strong>Location:</strong> {event.acf?.location || 'TBD'}</p>
              <p><strong>Max Attendees:</strong> {event.acf?.max_attendees || 'N/A'}</p>
              {signups[event.id] ? (
                <span className="signed-up-badge">✓ Signed Up</span>
              ) : (
                <button onClick={() => handleSignup(event.id)} className="btn btn-signup">Sign Up</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default EventsTab