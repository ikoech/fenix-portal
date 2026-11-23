import { useState, useEffect } from 'react'
import { updateEvent, deleteEvent } from '../api/admin'
import { updateMember, deleteMember } from '../api/members'
import { WP_API, FENIX_API } from '../api/config'
import ApplicationsAdmin from './ApplicationsAdmin'
import '../css/AdminTab.css'

function AdminTab({ user }) {
  const [stats, setStats] = useState(null)
  const [members, setMembers] = useState([])
  const [events, setEvents] = useState([])
  const [error, setError] = useState(null)
  const [activeSection, setActiveSection] = useState('overview')
  const [editingMember, setEditingMember] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMember, setNewMember] = useState({
    name: '',
    username: '',
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
        fetch(`${WP_API}/users`, { headers }),
        fetch(`${WP_API}/event`, { headers }),
        fetch(`${WP_API}/event-signups`, { headers }),
        fetch(`${WP_API}/tfa`, { headers }),
        fetch(`${WP_API}/seeking`, { headers }),
        fetch(`${WP_API}/documents`, { headers })
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
    if (window.confirm('Är du säker på att du vill ta bort den här medlemmen? Även innehåll som medlemmen har skapat tas bort.')) {
      deleteMember(sessionStorage.getItem('fenix_auth'), userId)
        .then(() => {
          setMembers(members.filter(m => m.id !== userId))
        })
        .catch(err => setError(err.message))
    }
  }
  // Handle delete actions
  const handleDeleteEvent = (eventId) => {
    if (window.confirm('Är du säker på att du vill ta bort detta evenemang?')) {
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
    // Validate input fields
    const name = newMember.name.trim()
    const username = newMember.username.trim()
    const email = newMember.email.trim()
    if (!name) {
      reportValidationError('Namn är obligatoriskt.')
      return
    }
    if (!username) {
      reportValidationError('Användarnamn är obligatoriskt.')
      return
    }
    if (username.length > 60 || !/^[a-zA-Z0-9_.-]+$/.test(username)) {
      reportValidationError('Användarnamnet måste vara 1–60 tecken och får endast innehålla bokstäver, siffror, punkter, understreck eller bindestreck.')
      return
    }
    if (!email) {
      reportValidationError('E-postadress är obligatorisk.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      reportValidationError('Ange en giltig e-postadress.')
      return
    }
    if (newMember.password.length < 8) {
      reportValidationError('Lösenordet måste innehålla minst 8 tecken.')
      return
    }
    // Check for existing username or email
    const authHeader = sessionStorage.getItem('fenix_auth')
    if (!authHeader) {
      reportValidationError('Administratörssessionen har gått ut. Logga in igen.')
      return
    }

    setIsAddingMember(true)
    try {
      const res = await fetch(`${WP_API}/users`, {
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
        throw new Error(created?.message || `Kunde inte skapa medlemmen (${res.status})`)
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
        const profileRes = await fetch(`${FENIX_API}/users/${created.id}`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ acf: savedMember.acf })
        })
        profile = await profileRes.json().catch(() => null)
        if (!profileRes.ok) {
          throw new Error(profile?.message || `Begäran misslyckades (${profileRes.status})`)
        }
      } catch (profileError) {
        setShowAddMember(false)
        setNewMember({
          name: '',
          username: '',
          email: '',
          password: '',
          company: '',
          phone: '',
          bio: '',
          interests: '',
          photo: '',
          linkedin: ''
        })
        setAddStatus(`Medlemmen skapades, men profiluppgifterna kunde inte sparas: ${profileError.message}`)
        setAddStatusType('error')
        return
      }
      // Update the members list with the profile data
      setMembers(prev => prev.map(member => member.id === profile.id ? profile : member))
      setShowAddMember(false)
      setNewMember({
        name: '',
        username: '',
        email: '',
        password: '',
        company: '',
        phone: '',
        bio: '',
        interests: '',
        photo: '',
        linkedin: ''
      })
      setAddStatus('Medlemmen har skapats! Hen kan logga in via inloggningssidan.')
      setAddStatusType('success')
    } catch (err) {
      setAddStatus('Kunde inte lägga till medlemmen: ' + err.message)
      setAddStatusType('error')
    } finally {
      setIsAddingMember(false)
    }
  }
  // Render the admin dashboard or access denied message
  if (!isAdmin) {
    return (
      <div className="admin-denied">
        <h2>Åtkomst nekad</h2>
        <p>Du måste vara administratör för att visa den här sidan.</p>
      </div>
    )
  }

  return (
    <section className="admin-section">
      <h2>Administratörspanel</h2>
      {error && <p className="error-msg">{error}</p>}

      <div className="admin-nav">
        <button className={`admin-tab ${activeSection === 'overview' ? 'active' : ''}`} onClick={() => setActiveSection('overview')}>Översikt</button>
        <button className={`admin-tab ${activeSection === 'members' ? 'active' : ''}`} onClick={() => setActiveSection('members')}>Medlemmar</button>
        <button className={`admin-tab ${activeSection === 'events' ? 'active' : ''}`} onClick={() => setActiveSection('events')}>Evenemang</button>
        <button className={`admin-tab ${activeSection === 'applications' ? 'active' : ''}`} onClick={() => setActiveSection('applications')}>Ansökningar</button>
      </div>

      {activeSection === 'applications' && <ApplicationsAdmin />}

      {/* Overview */}
      {activeSection === 'overview' && stats && (
        <div>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-number">{stats.members}</span>
              <span className="stat-label">Medlemmar</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.events}</span>
              <span className="stat-label">Evenemang</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.signups}</span>
              <span className="stat-label">Anmälningar</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.deals}</span>
              <span className="stat-label">TFA-affärer</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.seeking}</span>
              <span className="stat-label">Sökta tjänster</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.documents}</span>
              <span className="stat-label">Dokument</span>
            </div>
          </div>

        </div>
      )}

      {/* Members list */}
      {activeSection === 'members' && (
        <div>
          <div className="admin-section-header">
            <h3>Medlemmar</h3>
            {!editingMember && !showAddMember && (
              <button className="btn-admin-save" onClick={() => {
                setAddStatus('')
                setAddStatusType('')
                setShowAddMember(true)
              }}>+ Lägg till medlem</button>
            )}
          </div>
          {addStatus && (
            <p className={`add-member-status ${addStatusType}`} role={addStatusType === 'error' ? 'alert' : 'status'}>
              {addStatus}
            </p>
          )}

          {showAddMember && (
            <form className="admin-edit-form" onSubmit={handleAddMember} noValidate>
              <h3>Lägg till ny medlem</h3>
              <div className="form-group">
                <label htmlFor="new-member-name">Namn *</label>
                <input id="new-member-name" type="text" value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="new-member-username">Användarnamn *</label>
                <input id="new-member-username" type="text" autoComplete="username" maxLength={60} pattern="[A-Za-z0-9_.-]+" value={newMember.username} onChange={e => setNewMember({ ...newMember, username: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="new-member-email">E-post *</label>
                <input id="new-member-email" type="email" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="new-member-password">Lösenord * (minst 8 tecken)</label>
                <input id="new-member-password" type="password" autoComplete="new-password" minLength={8} value={newMember.password} onChange={e => setNewMember({ ...newMember, password: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="new-member-company">Företag</label>
                <input id="new-member-company" value={newMember.company} onChange={e => setNewMember({ ...newMember, company: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="new-member-phone">Telefon</label>
                <input id="new-member-phone" type="tel" value={newMember.phone} onChange={e => setNewMember({ ...newMember, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="new-member-bio">Presentation</label>
                <textarea id="new-member-bio" rows={3} value={newMember.bio} onChange={e => setNewMember({ ...newMember, bio: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="new-member-interests">Intressen</label>
                <input id="new-member-interests" value={newMember.interests} onChange={e => setNewMember({ ...newMember, interests: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="new-member-photo">Bild-URL</label>
                <input id="new-member-photo" type="url" value={newMember.photo} onChange={e => setNewMember({ ...newMember, photo: e.target.value })} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label htmlFor="new-member-linkedin">LinkedIn</label>
                <input id="new-member-linkedin" type="url" value={newMember.linkedin} onChange={e => setNewMember({ ...newMember, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="form-buttons">
                <button type="submit" className="btn-admin-save" disabled={isAddingMember}>
                  {isAddingMember ? 'Skapar...' : 'Skapa medlem'}
                </button>
                <button type="button" className="btn-admin-cancel" disabled={isAddingMember} onClick={() => {
                  setShowAddMember(false)
                  setAddStatus('')
                  setAddStatusType('')
                }}>Avbryt</button>
              </div>
            </form>
          )}

          {!showAddMember && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Namn</th>
                  <th>Företag</th>
                  <th>E-post</th>
                  <th>Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>{(Array.isArray(m.acf) ? {} : m.acf)?.company || '—'}</td>
                    <td>{m.email || '—'}</td>
                    <td>
                      <button onClick={() => handleEditMember(m)} className="btn-admin-edit">Redigera</button>
                      <button onClick={() => handleDeleteMember(m.id)} className="btn-admin-delete">Ta bort</button>
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
          <h3>Evenemang</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Evenemang</th>
                <th>Plats</th>
                <th>Max antal deltagare</th>
                <th>Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id}>
                  <td>{ev.title?.rendered}</td>
                  <td>{ev.acf?.location || 'Ej bestämt'}</td>
                  <td>{ev.acf?.max_attendees || 'Ej angivet'}</td>
                  <td>
                    <button onClick={() => handleEditEvent(ev)} className="btn-admin-edit">Redigera</button>
                    <button onClick={() => handleDeleteEvent(ev.id)} className="btn-admin-delete">Ta bort</button>
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
          <h3>Redigera medlem: {editingMember.name}</h3>
          <form onSubmit={(e) => handleUpdateMember(e, editingMember.id)}>
            <div className="form-group">
              <label>Namn</label>
              <input
                type="text"
                value={editingMember.name || ''}
                onChange={e => setEditingMember({...editingMember, name: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>E-post</label>
              <input
                type="email"
                value={editingMember.email || ''}
                onChange={e => setEditingMember({...editingMember, email: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Företag</label>
              <input
                type="text"
                value={editingMember.acf?.company || ''}
                onChange={e => setEditingMember({...editingMember, acf: {...editingMember.acf, company: e.target.value}})}
              />
            </div>
            <div className="form-group">
              <label>Telefon</label>
              <input
                type="text"
                value={editingMember.acf?.phone || ''}
                onChange={e => setEditingMember({...editingMember, acf: {...editingMember.acf, phone: e.target.value}})}
              />
            </div>
            <div className="form-group">
              <label>Presentation</label>
              <textarea
                value={editingMember.acf?.bio || ''}
                onChange={e => setEditingMember({...editingMember, acf: {...editingMember.acf, bio: e.target.value}})}
              />
            </div>
            <div className="form-group">
              <label>Intressen</label>
              <input
                value={editingMember.acf?.interests || ''}
                onChange={e => setEditingMember({...editingMember, acf: {...editingMember.acf, interests: e.target.value}})}
              />
            </div>
            <div className="form-group">
              <label>Bild-URL</label>
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
              <button type="submit" className="btn-admin-save">Spara</button>
              <button type="button" onClick={() => setEditingMember(null)} className="btn-admin-cancel">Avbryt</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Event Form */}
      {editingEvent && (
        <div className="admin-edit-form">
          <h3>Redigera evenemang: {editingEvent.title?.rendered}</h3>
          <form onSubmit={(e) => handleUpdateEvent(e, editingEvent.id)}>
            <div className="form-group">
              <label>Titel</label>
              <input
                type="text"
                value={editingEvent.title?.rendered || ''}
                onChange={e => setEditingEvent({...editingEvent, title: {rendered: e.target.value}})}
              />
            </div>
            <div className="form-group">
              <label>Datum (ÅÅÅÅMMDD)</label>
              <input
                type="text"
                value={editingEvent.acf?.event_date || ''}
                onChange={e => setEditingEvent({...editingEvent, acf: {...editingEvent.acf, event_date: e.target.value}})}
                placeholder="20261201"
              />
            </div>
            <div className="form-group">
              <label>Tid</label>
              <input
                type="time"
                value={editingEvent.acf?.event_time || ''}
                onChange={e => setEditingEvent({...editingEvent, acf: {...editingEvent.acf, event_time: e.target.value}})}
              />
            </div>
            <div className="form-group">
              <label>Plats</label>
              <input
                type="text"
                value={editingEvent.acf?.location || ''}
                onChange={e => setEditingEvent({...editingEvent, acf: {...editingEvent.acf, location: e.target.value}})}
              />
            </div>
            <div className="form-group">
              <label>Max antal deltagare</label>
              <input
                type="number"
                value={editingEvent.acf?.max_attendees || ''}
                onChange={e => setEditingEvent({...editingEvent, acf: {...editingEvent.acf, max_attendees: e.target.value}})}
              />
            </div>
            <div className="form-group">
              <label>Beskrivning</label>
              <textarea
                value={editingEvent.acf?.description || ''}
                onChange={e => setEditingEvent({...editingEvent, acf: {...editingEvent.acf, description: e.target.value}})}
                rows={4}
              />
            </div>
            <div className="form-buttons">
              <button type="submit" className="btn-admin-save">Spara</button>
              <button type="button" onClick={() => setEditingEvent(null)} className="btn-admin-cancel">Avbryt</button>
            </div>
          </form>
        </div>
      )}

    </section>
  )
}

export default AdminTab