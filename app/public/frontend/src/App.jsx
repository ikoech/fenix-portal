import { useState, useEffect } from 'react'
import { login } from './api/auth'
import Login from './components/Login'
import EventsTab from './components/EventsTab'
import ProfileTab from './components/ProfileTab'
import MembersTab from './components/MembersTab'
import TfaTab from './components/TfaTab'
import SeekingTab from './components/SeekingTab'
import DocumentTab from './components/DocumentsTab'
import ContactPage from './components/ContactPage'
import IntegrityPolicyPage from './components/IntegrityPolicyPage'
import Header from './components/Header'
import Footer from './components/Footer'
import AdminTab from './components/AdminTab'
import { fetchUserProfile } from './api/auth'
import StartPage from './components/StartPage'
import MemberDirectoryTab from './components/MemberDirectoryTab'
import './App.css'

function getInitialTab() {
  const params = new URLSearchParams(window.location.search)
  const tabParam = params.get('tab')
  const validTabs = ['start', 'events', 'directory', 'profile', 'admin', 'members', 'tfa', 'seeking', 'Documents', 'contact', 'integrity-policy']
  return tabParam && validTabs.includes(tabParam) ? tabParam : 'start'
}

function App() {
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(getInitialTab)
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
    setActiveTab('start')
    sessionStorage.removeItem('fenix_user')
    sessionStorage.removeItem('fenix_auth')
  }

  if (loading) return <div className="status">Loading...</div>

  const isAdmin = user?.id === 1 || user?.roles?.includes('administrator')

  return (
    <div className={`app${user && activeTab === 'start' ? ' app--start' : ''}`}>
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

      <main className={activeTab === 'integrity-policy' ? 'main--integrity-policy' : undefined}>
        {error && !showLogin && <p className="error-msg" role="alert">{error}</p>}
        {activeTab === 'events' && (
          <EventsTab user={user} onRequireLogin={() => setShowLogin(true)} />
        )}
        {activeTab === 'members' && <MembersTab />}
        {user && activeTab === 'directory' && <MemberDirectoryTab />}
        {activeTab === 'contact' && <ContactPage />}
        {activeTab === 'integrity-policy' && <IntegrityPolicyPage />}
        {user && activeTab === 'admin' && <AdminTab user={user} />}
        {user && activeTab === 'profile' && <ProfileTab user={user} />}
        {user && activeTab === 'tfa' && <TfaTab user={user} />}
        {user && activeTab === 'seeking' && <SeekingTab user={user} />}
        {user && activeTab === 'Documents' && (
          <DocumentTab authHeader={sessionStorage.getItem('fenix_auth')} />
        )}
        {user && activeTab === 'start' && <StartPage user={user} />}

        {!user && activeTab === 'start' && (
          <section className="start-gate">
            <h2>Välkommen till Fenix Medlemsportal</h2>
            <p>Logga in för att se din personliga startsida.</p>
            <button className="btn-primary" onClick={() => setShowLogin(true)}>
              Logga in
            </button>
          </section>
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