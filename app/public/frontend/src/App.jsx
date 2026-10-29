import { useState, useEffect } from 'react'
import { login } from './api/auth'
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
      setShowLogin(false)
    } catch (err) {
      setError(err.message)
    }
  }

  // Handle logout
  const handleLogout = () => {
    setUser(null)
    setActiveTab('events')
    sessionStorage.removeItem('fenix_user')
    sessionStorage.removeItem('fenix_auth')
  }

  if (loading) return <div className="status">Loading...</div>

  const isAdmin = user?.id === 1 || user?.roles?.includes('administrator')

  return (
    <div className="app">
      <Header
        user={user}
        onLogout={handleLogout}
        showTabs={!!user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
        showPublicTabs={!user}
        onRequestLogin={() => setShowLogin(true)}
      />

      <main>
        {error && !showLogin && <p className="error-msg" role="alert">{error}</p>}
        {activeTab === 'events' && (
          <EventsTab user={user} onRequireLogin={() => setShowLogin(true)} />
        )}
        {activeTab === 'members' && <MembersTab />}
        {user && activeTab === 'admin' && <AdminTab user={user} />}
        {user && activeTab === 'profile' && <ProfileTab user={user} />}
        {user && activeTab === 'tfa' && <TfaTab user={user} />}
        {user && activeTab === 'seeking' && <SeekingTab user={user} />}
        {user && activeTab === 'Documents' && (
          <DocumentTab authHeader={sessionStorage.getItem('fenix_auth')} />
        )}
      </main>

      <Footer />
      {showLogin && !user && (
        <div className="modal-backdrop" onClick={() => setShowLogin(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Member login"
            onClick={event => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowLogin(false)}
              aria-label="Close login"
            >
              ×
            </button>
            <Login onLogin={handleLogin} error={error} />
          </div>
        </div>
      )}
    </div>
  )
}

export default App