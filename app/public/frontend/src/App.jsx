import { useState, useEffect } from 'react'
import { login, fetchEvents } from './api'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [events, setEvents] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  // Check for saved session on load
  useEffect(() => {
    const savedUser = sessionStorage.getItem('fenix_user')
    const savedAuth = sessionStorage.getItem('fenix_auth')
    if (savedUser && savedAuth) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  // Fetch events when user changes
  useEffect(() => {
    fetchEvents()
      .then(data => {
        setEvents(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const userData = await login(username, password)
      setUser(userData)
      sessionStorage.setItem('fenix_user', JSON.stringify(userData))
      sessionStorage.setItem('fenix_auth', btoa(`${username}:${password}`))
    } catch (err) {
      setError(err.message)
    }
  }

  const handleLogout = () => {
    setUser(null)
    sessionStorage.removeItem('fenix_user')
    sessionStorage.removeItem('fenix_auth')
  }

  if (loading) return <div className="status">Loading...</div>

  return (
    <div className="app">
      <header>
        <h1>Affärsnätverket Fenix</h1>
        <p>Member Portal</p>
        {user ? (
          <div className="user-bar">
            <span>Welcome, <strong>{user.name}</strong></span>
            <button onClick={handleLogout} className="btn btn-logout">Log out</button>
          </div>
        ) : null}
      </header>

      <main>
        {!user ? (
          <section className="login-section">
            <h2>Member Login</h2>
            {error && <p className="error-msg">{error}</p>}
            <form onSubmit={handleLogin}>
              <label>
                Username
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </label>
              <label>
                Application Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
              <button type="submit" className="btn btn-login">Log in</button>
            </form>
          </section>
        ) : (
          <section>
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
          </section>
        )}
      </main>
    </div>
  )
}

export default App