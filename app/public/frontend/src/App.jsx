import { useState, useEffect } from 'react'
import { login } from './api/auth'
import StartPage from './components/StartPage'      // ← new
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
import { fetchUserProfile } from './api/auth'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('events')
  const [view, setView] = useState('start')    
  const [showLogin, setShowLogin] = useState(false)

  // Restore session on load
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('fenix_auth')
    let cancelled = false

    async function restoreSession() {
      if (!savedAuth) {
        setLoading(false)
        return
      }

      try {
        const userData = await fetchUserProfile(savedAuth)
        if (cancelled) return
        setUser(userData)
        sessionStorage.setItem('fenix_user', JSON.stringify(userData))
      } catch (err) {
        if (cancelled) return
        sessionStorage.removeItem('fenix_user')
        sessionStorage.removeItem('fenix_auth')
        setError(`Your session could not be restored. Please sign in again. ${err.message}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

  // Handle login
  const handleLogin = async (username, password) => {
    setError(null)
    try {
      const { user: userData, authHeader } = await login(username, password)
      setUser(userData)
      sessionStorage.setItem('fenix_user', JSON.stringify(userData))
      sessionStorage.setItem('fenix_auth', authHeader)
    } catch (err) {
      setError(err.message)
    }
  }

  // Handle logout
  const handleLogout = () => {
    setUser(null)
    sessionStorage.removeItem('fenix_user')
    sessionStorage.removeItem('fenix_auth')
  }

  if (loading) return <div className="status">Loading...</div>

  const isAdmin = user?.id === 1 || user?.roles?.includes('administrator')

  // ── Public start page ─────────────────────────────
    if (view === 'start') {
      return (
      <>
        <Header user={user} onLogout={handleLogout} />
        <StartPage
          loggedIn={!!user}
          onJoin={() => {
            if (user) { setView('portal'); setActiveTab('members'); }
            else setShowLogin(true);
          }}
          onEnterPortal={() => setView('portal')}
        />
        {showLogin && (
          <div className="modal-backdrop" onClick={() => setShowLogin(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowLogin(false)} aria-label="Stäng">×</button>
              <Login onLogin={handleLogin} error={error} />
            </div>
          </div>
        )}
        <Footer />
      </>
      )
    }

   
  return (
    <div className="app">
      <Header user={user} onLogout={handleLogout} />

      <main>
        {!user ? (
          <Login onLogin={handleLogin} error={error} />
        ) : (
          <>
            <nav className="tabs">
              <button className="tab" onClick={() => setView('start')}>Start</button>
              {isAdmin && (
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
            {activeTab === 'profile' && <ProfileTab user={user} />}
            {activeTab === 'members' && <MembersTab />}
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