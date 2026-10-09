import { useState, useEffect } from 'react'
import '../css/AdminTab.css'

function AdminTab({ user }) {
  const [stats, setStats] = useState(null)
  const [recentSignups, setRecentSignups] = useState([])
  const [members, setMembers] = useState([])
  const [events, setEvents] = useState([])
  const [error, setError] = useState(null)
  const [activeSection, setActiveSection] = useState('overview')

  // Check if user is admin
  const isAdmin = user?.id === 1 || user?.roles?.includes('administrator')

  useEffect(() => {
    if (!isAdmin) return
    loadAdminData()
  }, [user])

  async function loadAdminData() {
    try {
      const authHeader = sessionStorage.getItem('fenix_auth')
      const headers = { 'Authorization': authHeader }

      const [membersRes, eventsRes, signupsRes, tfaRes, seekingRes, docsRes] = await Promise.all([
        fetch('http://fenix-portal.local/wp-json/wp/v2/users', { headers }),
        fetch('http://fenix-portal.local/wp-json/wp/v2/event', { headers }),
        fetch('http://fenix-portal.local/wp-json/wp/v2/event-signups', { headers }),
        fetch('http://fenix-portal.local/wp-json/wp/v2/tfa', { headers }),
        fetch('http://fenix-portal.local/wp-json/wp/v2/seeking', { headers }),
        fetch('http://fenix-portal.local/wp-json/wp/v2/documents', { headers })
      ])

      const membersData = await membersRes.json()
      const eventsData = await eventsRes.json()
      const signupsData = await signupsRes.json()
      const tfaData = await tfaRes.json()
      const seekingData = await seekingRes.json()
      const docsData = await docsRes.json()

      setStats({
        members: membersData.length,
        events: eventsData.length,
        signups: signupsData.length,
        deals: tfaData.length,
        seeking: seekingData.length,
        documents: docsData.length
      })

      // Sort signups by date (newest first)
      const sortedSignups = signupsData.sort((a, b) =>
        new Date(b.date) - new Date(a.date)
      ).slice(0, 5)
      setRecentSignups(sortedSignups)
      setMembers(membersData)
      setEvents(eventsData)
    } catch (err) {
      setError(err.message)
    }
  }

  if (!isAdmin) {
    return (
      <div className="admin-denied">
        <h2>Access Denied</h2>
        <p>You must be an administrator to view this page.</p>
      </div>
    )
  }

  return (
    <section className="admin-section">
      <h2>Admin Dashboard</h2>
      {error && <p className="error-msg">{error}</p>}

      {/* Section tabs */}
      <div className="admin-nav">
        <button className={`admin-tab ${activeSection === 'overview' ? 'active' : ''}`} onClick={() => setActiveSection('overview')}>Overview</button>
        <button className={`admin-tab ${activeSection === 'members' ? 'active' : ''}`} onClick={() => setActiveSection('members')}>Members</button>
        <button className={`admin-tab ${activeSection === 'events' ? 'active' : ''}`} onClick={() => setActiveSection('events')}>Events</button>
      </div>

      {/* Overview */}
      {activeSection === 'overview' && stats && (
        <div>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-number">{stats.members}</span>
              <span className="stat-label">Members</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.events}</span>
              <span className="stat-label">Events</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.signups}</span>
              <span className="stat-label">Sign-ups</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.deals}</span>
              <span className="stat-label">TFA Deals</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.seeking}</span>
              <span className="stat-label">Seeking Posts</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.documents}</span>
              <span className="stat-label">Documents</span>
            </div>
          </div>

          <h3>Recent Sign-ups</h3>
          {recentSignups.length === 0 ? (
            <p>No sign-ups yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentSignups.map(s => (
                  <tr key={s.id}>
                    <td>{s.title?.rendered || 'Unknown'}</td>
                    <td>{new Date(s.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Members list */}
      {activeSection === 'members' && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.acf?.company || '—'}</td>
                <td>{m.email || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Events list */}
      {activeSection === 'events' && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Location</th>
              <th>Max Attendees</th>
            </tr>
          </thead>
          <tbody>
            {events.map(ev => (
              <tr key={ev.id}>
                <td>{ev.title?.rendered}</td>
                <td>{ev.acf?.location || 'TBD'}</td>
                <td>{ev.acf?.max_attendees || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

export default AdminTab