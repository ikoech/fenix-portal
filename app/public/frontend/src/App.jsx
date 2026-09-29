import { useState, useEffect } from 'react'
import { login, fetchUserProfile, getAuthHeader } from './api'
import Login from './components/Login'
import EventsTab from './components/EventsTab'
import ProfileTab from './components/ProfileTab'
import MembersTab from './components/MembersTab'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('events')

  // Restore session on load
  useEffect(() => {
    const savedUser = sessionStorage.getItem('fenix_user')
    const savedAuth = sessionStorage.getItem('fenix_auth')
    if (savedUser && savedAuth) {
      setUser(JSON.parse(savedUser))
      fetchUserProfile(savedAuth).then(setProfile).catch(() => {})
    }
    setLoading(false)
  }, [])

  // Handle login
  const handleLogin = async (username, password) => {
    setError(null)
    try {
      const userData = await login(username, password)
      const authHeader = getAuthHeader(username, password)
      setUser(userData)
      sessionStorage.setItem('fenix_user', JSON.stringify(userData))
      sessionStorage.setItem('fenix_auth', authHeader)
      const prof = await fetchUserProfile(authHeader)
      setProfile(prof)
    } catch (err) {
      setError(err.message)
    }
  }
  // Handle logout
  const handleLogout = () => {
    setUser(null)
    setProfile(null)
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
          <Login onLogin={handleLogin} error={error} />
        ) : (
          <>
            <nav className="tabs">
              <button className={`tab ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>Events</button>
              <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>My Profile</button>
              <button className={`tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>Members</button>
            </nav>

            {activeTab === 'events' && <EventsTab user={user} />}
            {activeTab === 'profile' && <ProfileTab profile={profile} />}
            {activeTab === 'members' && <MembersTab user={user} />}
          </>
        )}
      </main>
    </div>
  )
}

export default App