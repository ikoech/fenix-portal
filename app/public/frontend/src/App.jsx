import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [events, setEvents] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://fenix-portal.local/wp-json/wp/v2/event')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        setEvents(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="status">Loading events...</div>
  if (error) return <div className="status error">Error: {error}</div>

  return (
    <div className="app">
      <header>
        <h1>Affärsnätverket Fenix</h1>
        <p>Member Portal</p>
      </header>

      <main>
        <h2>Upcoming Events</h2>
        {events.length === 0 ? (
          <p>No events found.</p>
        ) : (
          <ul className="event-list">
            {events.map(event => (
              <li key={event.id} className="event-card">
                <h3>{event.title.rendered}</h3>
                <p><strong>Date:</strong> {event.acf?.event_date || 'TBD'}</p>
                <p><strong>Location:</strong> {event.acf?.location || 'TBD'}</p>
                <p><strong>Max Attendees:</strong> {event.acf?.max_attendees || 'N/A'}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

export default App