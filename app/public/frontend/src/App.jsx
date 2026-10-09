import { useState, useEffect } from 'react'
import { login, fetchUserProfile, getAuthHeader } from './api/auth'
import Login from './components/Login'
import EventsTab from './components/EventsTab'
import ProfileTab from './components/ProfileTab'
import MembersTab from './components/MembersTab'
import TfaTab from './components/TfaTab'
import SeekingTab from './components/SeekingTab'
import DocumentTab from './components/DocumentsTab'
import Header from './components/Header'
import Footer from './components/Footer'
import AdminTab from './components/AdminTab'
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
      <Header user={user} onLogout={handleLogout} />

      <main>
        {!user ? (
          <Login onLogin={handleLogin} error={error} />
        ) : (
          <>
            <nav className="tabs">
              {user?.id === 1 && (
              <button className={`tab ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>Admin</button>
            )}
              <button className={`tab ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>Events</button>
              <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>My Profile</button>
              <button className={`tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>Members</button>
              <button className={`tab ${activeTab === 'tfa' ? 'active' : ''}`} onClick={() => setActiveTab('tfa')}>TFA Deals</button>
              <button className={`tab ${activeTab === 'seeking' ? 'active' : ''}`} onClick={() => setActiveTab('seeking')}>Seeking</button>
              <button className={`tab ${activeTab === 'Documents' ? 'active' : ''}`} onClick={() => setActiveTab('Documents')}>Document Library</button>
            </nav>
            {activeTab === 'admin' && <AdminTab user={user} />}
            {activeTab === 'events' && <EventsTab user={user} />}
            {activeTab === 'profile' && <ProfileTab profile={profile} />}
            {activeTab === 'members' && <MembersTab user={user} />}
            {activeTab === 'tfa' && <TfaTab user={user} />}
            {activeTab === 'seeking' && <SeekingTab user={user} />}
            {activeTab === 'Documents' && <DocumentTab authHeader={sessionStorage.getItem('fenix_auth')} />}
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default App