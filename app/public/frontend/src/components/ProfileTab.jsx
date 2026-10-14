import { useEffect, useState } from 'react'
import { updateMember } from '../api/members'
import '../css/ProfileTab.css'

const PROFILE_URL = 'http://fenix-portal.local/wp-json/wp/v2/users/me'

function copyProfile(profile) {
  return {
    ...profile,
    acf: { ...(profile.acf || {}) },
    roles: Array.isArray(profile.roles) ? [...profile.roles] : []
  }
}

function getRole(profile) {
  const role = profile.acf?.role || profile.roles?.join(', ')
  return role || 'Not set'
}

function ProfileTab({ user }) {
  const [profile, setProfile] = useState(null)
  const [savedProfile, setSavedProfile] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let isCurrent = true

    async function loadProfile() {
      setLoading(true)
      setError('')
      const authHeader = sessionStorage.getItem('fenix_auth')

      if (!authHeader) {
        if (isCurrent) {
          setError('Not logged in — please log in.')
          setLoading(false)
        }
        return
      }

      try {
        const res = await fetch(PROFILE_URL, {
          cache: 'no-store',
          headers: { Authorization: authHeader }
        })
        if (!res.ok) {
          throw new Error(`Could not load profile (${res.status})`)
        }

        const data = await res.json()
        if (isCurrent) {
          const loadedProfile = copyProfile(data)
          setProfile(loadedProfile)
          setSavedProfile(copyProfile(loadedProfile))
        }
      } catch (err) {
        if (isCurrent) {
          setError(err instanceof Error ? err.message : 'Could not load profile.')
        }
      } finally {
        if (isCurrent) setLoading(false)
      }
    }

    loadProfile()
    return () => {
      isCurrent = false
    }
  }, [user?.id])

  function updateField(field, value) {
    setProfile(current => ({
      ...current,
      acf: { ...(current?.acf || {}), [field]: value }
    }))
  }

  function startEdit() {
    setError('')
    setSuccess('')
    setEditMode(true)
  }

  function cancelEdit() {
    if (savedProfile) setProfile(copyProfile(savedProfile))
    setEditMode(false)
    setError('')
    setSuccess('')
  }

  async function saveProfile(event) {
    event.preventDefault()
    const authHeader = sessionStorage.getItem('fenix_auth')

    if (!authHeader) {
      setError('Not logged in — please log in.')
      return
    }
    if (!profile) {
      setError('Profile is not available. Please reload and try again.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const updated = await updateMember(authHeader, user?.id || profile.id, {
        name: profile.name,
        email: profile.email,
        acf: { ...(profile.acf || {}) }
      })
      const updatedProfile = copyProfile(updated)
      setProfile(updatedProfile)
      setSavedProfile(copyProfile(updatedProfile))
      setEditMode(false)
      setSuccess('Profile updated!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="profile-loading">Loading profile...</p>
  }

  if (error && !profile) {
    return (
      <section className="profile-section">
        <h2>My Profile</h2>
        <p className="error-msg" role="alert">{error}</p>
      </section>
    )
  }

  if (!profile) {
    return (
      <section className="profile-section">
        <h2>My Profile</h2>
        <p className="error-msg" role="alert">Profile is not available. Please reload and try again.</p>
      </section>
    )
  }

  const acf = profile.acf || {}

  return (
    <section className="profile-section">
      <h2>{editMode ? 'Edit Profile' : 'My Profile'}</h2>
      {error && <p className="error-msg" role="alert">{error}</p>}
      {success && <p className="success-msg" role="status">{success}</p>}

      {editMode ? (
        <form className="profile-form" onSubmit={saveProfile}>
          <div className="form-group">
            <label htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              type="text"
              value={profile.name || ''}
              onChange={event => setProfile(current => ({ ...current, name: event.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-email">Email</label>
            <input
              id="profile-email"
              type="email"
              value={profile.email || ''}
              onChange={event => setProfile(current => ({ ...current, email: event.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-company">Company</label>
            <input
              id="profile-company"
              type="text"
              value={acf.company || ''}
              onChange={event => updateField('company', event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-phone">Phone</label>
            <input
              id="profile-phone"
              type="tel"
              value={acf.phone || ''}
              onChange={event => updateField('phone', event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-bio">Bio</label>
            <textarea
              id="profile-bio"
              value={acf.bio || ''}
              onChange={event => updateField('bio', event.target.value)}
              rows={4}
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-interests">Interests</label>
            <textarea
              id="profile-interests"
              value={acf.interests || ''}
              onChange={event => updateField('interests', event.target.value)}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-photo">Photo URL</label>
            <input
              id="profile-photo"
              type="url"
              value={acf.photo || acf.avatar_url || ''}
              onChange={event => updateField('avatar_url', event.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-linkedin">LinkedIn URL</label>
            <input
              id="profile-linkedin"
              type="url"
              value={acf.linkedin || ''}
              onChange={event => updateField('linkedin', event.target.value)}
              placeholder="https://www.linkedin.com/in/..."
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-save-profile" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              className="btn-cancel-profile"
              onClick={cancelEdit}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="profile-card">
          <div className="profile-photo-wrap">
            {(acf.photo || acf.avatar_url) ? (
              <img src={acf.photo || acf.avatar_url} alt={`${profile.name || 'User'} profile`} className="profile-photo" />
            ) : (
              <div className="profile-avatar" aria-label="Profile photo placeholder">
                {(profile.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h3 className="profile-name">{profile.name || 'Not set'}</h3>
          <p className="profile-role">{getRole(profile)}</p>
          <p className="profile-company">{acf.company || 'Not set'}</p>

          <table className="profile-table">
            <tbody>
              <tr><th scope="row">Email</th><td>{profile.email || 'Not set'}</td></tr>
              <tr><th scope="row">Phone</th><td>{acf.phone || 'Not set'}</td></tr>
              <tr><th scope="row">Bio</th><td>{acf.bio || 'Not set'}</td></tr>
              <tr><th scope="row">Interests</th><td>{acf.interests || 'Not set'}</td></tr>
              <tr>
                <th scope="row">LinkedIn</th>
                <td>
                  {acf.linkedin ? (
                    <a href={acf.linkedin} target="_blank" rel="noopener noreferrer">{acf.linkedin}</a>
                  ) : 'Not set'}
                </td>
              </tr>
            </tbody>
          </table>

          <button type="button" className="btn-edit-profile" onClick={startEdit}>Edit Profile</button>
        </div>
      )}
    </section>
  )
}

export default ProfileTab
