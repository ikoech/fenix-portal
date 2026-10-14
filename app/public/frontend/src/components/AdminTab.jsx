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
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    password: '',
    company: '',
    phone: '',
    bio: '',
    interests: '',
    photo: '',
    linkedin: ''
  })
  const [addStatus, setAddStatus] = useState('')
  const [addStatusType, setAddStatusType] = useState('')
  const [isAddingMember, setIsAddingMember] = useState(false)

  // Check if user is admin
  const isAdmin = user?.id === 1 || user?.roles?.includes('administrator')

  useEffect(() => {
    if (!isAdmin) return
    loadAdminData()
  }, [user])
  // Load admin data from API
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
      // Check for errors in responses
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
  // Handle edit and delete actions
  const handleEditMember = (member) => {
    setEditingMember({...member})
  }
  // Handle edit and delete actions
  const handleEditEvent = (event) => {
    setEditingEvent({...event})
  }
  // Handle delete actions
  const handleDeleteMember = (userId) => {
    if (window.confirm('Are you sure you want to delete this member?')) {
      deleteMember(sessionStorage.getItem('fenix_auth'), userId)
        .then(() => {
          setMembers(members.filter(m => m.id !== userId))
        })
        .catch(err => setError(err.message))
    }
  }
  // Handle delete actions
  const handleDeleteEvent = (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      deleteEvent(sessionStorage.getItem('fenix_auth'), eventId)
        .then(() => {
          setEvents(events.filter(e => e.id !== eventId))
        })
        .catch(err => setError(err.message))
    }
  }
  // Handle update actions
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
  // Handle update actions
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
  // Handle adding a new member
  async function handleAddMember(e) {
    e.preventDefault()
    setAddStatus('')
    setAddStatusType('')
    // Validate input fields
    const reportValidationError = message => {
      setAddStatus(message)
      setAddStatusType('error')
    }
    // Trim inputs and generate username
    const name = newMember.name.trim()
    const email = newMember.email.trim()
    const username = email.toLowerCase().replace(/[^a-z0-9_.-]/g, '-').slice(0, 60)
    if (!name) {
      reportValidationError('Name is required.')
      return
    }
    if (!email) {
      reportValidationError('Email is required.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      reportValidationError('Enter a valid email address.')
      return
    }
    if (newMember.password.length < 8) {
      reportValidationError('Password must be at least 8 characters.')
      return
    }
    // Check for existing username or email
    const authHeader = sessionStorage.getItem('fenix_auth')
    if (!authHeader) {
      reportValidationError('Your admin session has expired. Please sign in again.')
      return
    }

    setIsAddingMember(true)
    try {
      const res = await fetch('http://fenix-portal.local/wp-json/wp/v2/users', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          name,
          email,
          password: newMember.password,
          roles: ['subscriber']
        })
      })

      const created = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(created?.message || `Failed to create member (${res.status})`)
      }

      const savedMember = {
        ...created,
        name,
        email,
        acf: {
          company: newMember.company.trim(),
          phone: newMember.phone.trim(),
          bio: newMember.bio.trim(),
          interests: newMember.interests.trim(),
          photo: newMember.photo.trim(),
          linkedin: newMember.linkedin.trim()
        }
      }
      setMembers(prev => [...prev, savedMember])
      setStats(prev => prev ? { ...prev, members: prev.members + 1 } : prev)

      // Now update the ACF fields for the new member
      let profile
      try {
        const profileRes = await fetch(`http://fenix-portal.local/wp-json/fenix/v1/users/${created.id}`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ acf: savedMember.acf })
        })
        profile = await profileRes.json().catch(() => null)
        if (!profileRes.ok) {
          throw new Error(profile?.message || `request failed (${profileRes.status})`)
        }
      } catch (profileError) {
        setShowAddMember(false)
        setNewMember({
          name: '',
          email: '',
          password: '',
          company: '',
          phone: '',
          bio: '',
          interests: '',
          photo: '',
          linkedin: ''
        })
        setAddStatus(`Member was created, but profile details could not be saved: ${profileError.message}`)
        setAddStatusType('error')
        return
      }
      // Update the members list with the profile data
      setMembers(prev => prev.map(member => member.id === profile.id ? profile : member))
      setShowAddMember(false)
      setNewMember({
        name: '',
        email: '',
        password: '',
        company: '',
        phone: '',
        bio: '',
        interests: '',
        photo: '',
        linkedin: ''
      })
      setAddStatus('Member added successfully! They can log in at the login page.')
      setAddStatusType('success')
    } catch (err) {
      setAddStatus('Could not add member: ' + err.message)
      setAddStatusType('error')
    } finally {
      setIsAddingMember(false)
    }
  }
  // Render the admin dashboard or access denied message
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
          <div className="admin-section-header">
            <h3>Members</h3>
            {!editingMember && !showAddMember && (
              <button className="btn-admin-save" onClick={() => {
                setAddStatus('')
                setAddStatusType('')
                setShowAddMember(true)
              }}>+ Add Member</button>
            )}
          </div>
          {addStatus && (
            <p className={`add-member-status ${addStatusType}`} role={addStatusType === 'error' ? 'alert' : 'status'}>
              {addStatus}
            </p>
          )}

          {showAddMember && (
            <form className="admin-edit-form" onSubmit={handleAddMember} noValidate>
              <h3>Add New Member</h3>
              <div className="form-group">
                <label htmlFor="new-member-name">Name *</label>
                <input id="new-member-name" type="text" value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="new-member-email">Email *</label>
                <input id="new-member-email" type="email" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="new-member-password">Password * (min 8 chars)</label>
                <input id="new-member-password" type="password" autoComplete="new-password" minLength={8} value={newMember.password} onChange={e => setNewMember({ ...newMember, password: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="new-member-company">Company</label>
                <input id="new-member-company" value={newMember.company} onChange={e => setNewMember({ ...newMember, company: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="new-member-phone">Phone</label>
                <input id="new-member-phone" type="tel" value={newMember.phone} onChange={e => setNewMember({ ...newMember, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="new-member-bio">Bio</label>
                <textarea id="new-member-bio" rows={3} value={newMember.bio} onChange={e => setNewMember({ ...newMember, bio: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="new-member-interests">Interests</label>
                <input id="new-member-interests" value={newMember.interests} onChange={e => setNewMember({ ...newMember, interests: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="new-member-photo">Photo URL</label>
                <input id="new-member-photo" type="url" value={newMember.photo} onChange={e => setNewMember({ ...newMember, photo: e.target.value })} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label htmlFor="new-member-linkedin">LinkedIn</label>
                <input id="new-member-linkedin" type="url" value={newMember.linkedin} onChange={e => setNewMember({ ...newMember, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="form-buttons">
                <button type="submit" className="btn-admin-save" disabled={isAddingMember}>
                  {isAddingMember ? 'Creating...' : 'Create Member'}
                </button>
                <button type="button" className="btn-admin-cancel" disabled={isAddingMember} onClick={() => {
                  setShowAddMember(false)
                  setAddStatus('')
                  setAddStatusType('')
                }}>Cancel</button>
              </div>
            </form>
          )}

          {!showAddMember && (
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
                    <td>{(Array.isArray(m.acf) ? {} : m.acf)?.company || '—'}</td>
                    <td>{m.email || '—'}</td>
                    <td>
                      <button onClick={() => handleEditMember(m)} className="btn-admin-edit">Edit</button>
                      <button onClick={() => handleDeleteMember(m.id)} className="btn-admin-delete">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
            <div className="form-group">
              <label>Interests</label>
              <input
                value={editingMember.acf?.interests || ''}
                onChange={e => setEditingMember({...editingMember, acf: {...editingMember.acf, interests: e.target.value}})}
              />
            </div>
            <div className="form-group">
              <label>Photo URL</label>
              <input
                value={editingMember.acf?.photo || ''}
                onChange={e => setEditingMember({...editingMember, acf: {...editingMember.acf, photo: e.target.value}})}
                placeholder="https://..."
              />
            </div>
            <div className="form-group">
              <label>LinkedIn</label>
              <input
                value={editingMember.acf?.linkedin || ''}
                onChange={e => setEditingMember({...editingMember, acf: {...editingMember.acf, linkedin: e.target.value}})}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div className="form-buttons">
              <button type="submit" className="btn-admin-save">Save</button>
              <button type="button" onClick={() => setEditingMember(null)} className="btn-admin-cancel">Cancel</button>
            </div>
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
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={editingEvent.acf?.description || ''}
                onChange={e => setEditingEvent({...editingEvent, acf: {...editingEvent.acf, description: e.target.value}})}
                rows={4}
              />
            </div>
            <div className="form-buttons">
              <button type="submit" className="btn-admin-save">Save</button>
              <button type="button" onClick={() => setEditingEvent(null)} className="btn-admin-cancel">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

export default AdminTab