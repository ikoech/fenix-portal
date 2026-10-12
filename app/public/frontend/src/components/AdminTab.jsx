import { useState, useEffect } from 'react'
import { updateEvent, deleteEvent } from '../api/admin'
import { updateMember, deleteMember } from '../api/members'
import '../css/AdminTab.css'

function AdminTab({ user }) {
  const [stats, setStats] = useState(null)
  const [recentSignups, setRecentSignups] = useState([])
  const [members, setMembers] = useState([])
  const [events, setEvents] = useState([])
  const [error, setError] = useState(null)
  const [activeSection, setActiveSection] = useState('overview')
  const [editingMember, setEditingMember] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)

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

  const handleEditMember = (member) => {
    setEditingMember({...member})
  }

  const handleEditEvent = (event) => {
    setEditingEvent({...event})
  }

  const handleDeleteMember = (userId) => {
    if (window.confirm('Are you sure you want to delete this member?')) {
      deleteMember(sessionStorage.getItem('fenix_auth'), userId)
        .then(() => {
          setMembers(members.filter(m => m.id !== userId))
        })
        .catch(err => setError(err.message))
    }
  }

  const handleDeleteEvent = (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      deleteEvent(sessionStorage.getItem('fenix_auth'), eventId)
        .then(() => {
          setEvents(events.filter(e => e.id !== eventId))
        })
        .catch(err => setError(err.message))
    }
  }

  const handleUpdateMember = async (e, userId) => {
    e.preventDefault()
    try {
      const authHeader = sessionStorage.getItem('fenix_auth')
      const updated = await updateMember(authHeader, userId, {
        name: editingMember.name,
        email: editingMember.email,
        acf: editingMember.acf
      })
      setMembers(members.map(m => m.id === userId ? updated : m))
      setEditingMember(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdateEvent = async (e, eventId) => {
    e.preventDefault()
    try {
      const authHeader = sessionStorage.getItem('fenix_auth')
      const updated = await updateEvent(authHeader, eventId, {
        title: editingEvent.title?.rendered,
        acf: editingEvent.acf
      })
      setEvents(events.map(e => e.id === eventId ? updated : e))
      setEditingEvent(null)
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
        <div>
          <h3>Members</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.acf?.company || '—'}</td>
                  <td>{m.email || '—'}</td>
                  <td>
                    <button onClick={() => handleEditMember(m)} className="btn-admin-edit">Edit</button>
                    <button onClick={() => handleDeleteMember(m.id)} className="btn-admin-delete">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Events list */}
      {activeSection === 'events' && (
        <div>
          <h3>Events</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Location</th>
                <th>Max Attendees</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id}>
                  <td>{ev.title?.rendered}</td>
                  <td>{ev.acf?.location || 'TBD'}</td>
                  <td>{ev.acf?.max_attendees || 'N/A'}</td>
                  <td>
                    <button onClick={() => handleEditEvent(ev)} className="btn-admin-edit">Edit</button>
                    <button onClick={() => handleDeleteEvent(ev.id)} className="btn-admin-delete">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Member Form */}
      {editingMember && (
        <div className="admin-edit-form">
          <h3>Edit Member: {editingMember.name}</h3>
          <form onSubmit={(e) => handleUpdateMember(e, editingMember.id)}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={editingMember.name || ''}
                onChange={e => setEditingMember({...editingMember, name: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={editingMember.email || ''}
                onChange={e => setEditingMember({...editingMember, email: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Company</label>
              <input
                type="text"
                value={editingMember.acf?.company || ''}
                onChange={e => setEditingMember({...editingMember, acf: {...editingMember.acf, company: e.target.value}})}
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="text"
                value={editingMember.acf?.phone || ''}
                onChange={e => setEditingMember({...editingMember, acf: {...editingMember.acf, phone: e.target.value}})}
              />
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea
                value={editingMember.acf?.bio || ''}
                onChange={e => setEditingMember({...editingMember, acf: {...editingMember.acf, bio: e.target.value}})}
              />
            </div>
            <button type="submit" className="btn-admin-save">Save</button>
            <button type="button" onClick={() => setEditingMember(null)} className="btn-admin-cancel">Cancel</button>
          </form>
        </div>
      )}

      {/* Edit Event Form */}
      {editingEvent && (
        <div className="admin-edit-form">
          <h3>Edit Event: {editingEvent.title?.rendered}</h3>
          <form onSubmit={(e) => handleUpdateEvent(e, editingEvent.id)}>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={editingEvent.title?.rendered || ''}
                onChange={e => setEditingEvent({...editingEvent, title: {rendered: e.target.value}})}
              />
            </div>
            <div className="form-group">
              <label>Date (YYYYMMDD)</label>
              <input
                type="text"
                value={editingEvent.acf?.event_date || ''}
                onChange={e => setEditingEvent({...editingEvent, acf: {...editingEvent.acf, event_date: e.target.value}})}
                placeholder="20261201"
              />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                value={editingEvent.acf?.event_time || ''}
                onChange={e => setEditingEvent({...editingEvent, acf: {...editingEvent.acf, event_time: e.target.value}})}
              />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={editingEvent.acf?.location || ''}
                onChange={e => setEditingEvent({...editingEvent, acf: {...editingEvent.acf, location: e.target.value}})}
              />
            </div>
            <div className="form-group">
              <label>Max Attendees</label>
              <input
                type="number"
                value={editingEvent.acf?.max_attendees || ''}
                onChange={e => setEditingEvent({...editingEvent, acf: {...editingEvent.acf, max_attendees: e.target.value}})}
              />
            </div>
            <button type="submit" className="btn-admin-save">Save</button>
            <button type="button" onClick={() => setEditingEvent(null)} className="btn-admin-cancel">Cancel</button>
          </form>
        </div>
      )}
    </section>
  )
}

export default AdminTab