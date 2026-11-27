import { useEffect, useState } from 'react'
import { changePassword, updateMember } from '../api/members'
import '../css/ProfileTab.css'

import { WP_API } from '../api/config'
const PROFILE_URL = `${WP_API}/users/me`

function copyProfile(profile) {
  return {
    ...profile,
    acf: { ...(profile.acf || {}) },
    roles: Array.isArray(profile.roles) ? [...profile.roles] : []
  }
}
// Get the display role for the profile
function getRole(profile) {
  if (profile.acf?.role) return profile.acf.role

  const labels = {
    administrator: 'Administratör',
    editor: 'Redaktör',
    author: 'Författare',
    contributor: 'Medarbetare',
    subscriber: 'Medlem'
  }
  const role = profile.roles?.map(value => labels[value] || value).join(', ')
  return role || 'Välj en roll'
}

function ProfileTab({ user, onPasswordChanged }) {
  const [profile, setProfile] = useState(null)
  const [savedProfile, setSavedProfile] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    let isCurrent = true
    // Load the profile data from the API
    async function loadProfile() {
      setLoading(true)
      setError('')
      const authHeader = sessionStorage.getItem('fenix_auth')

      if (!authHeader) {
        if (isCurrent) {
          setError('Du är inte inloggad. Logga in och försök igen.')
          setLoading(false)
        }
        return
      }
      // Fetch the profile data from the API
      try {
        const res = await fetch(PROFILE_URL, {
          cache: 'no-store',
          headers: { Authorization: authHeader }
        })
        if (!res.ok) {
          throw new Error(`Kunde inte hämta profilen (${res.status})`)
        }

        const data = await res.json()
        if (isCurrent) {
          const loadedProfile = copyProfile(data)
          setProfile(loadedProfile)
          setSavedProfile(copyProfile(loadedProfile))
        }
      } catch (err) {
        if (isCurrent) {
          setError(err instanceof Error ? err.message : 'Kunde inte hämta profilen.')
        }
      } finally {
        if (isCurrent) setLoading(false)
      }
    }
    // Call the function to load the profile data
    loadProfile()
    return () => {
      isCurrent = false
    }
  }, [user?.id])
  // Update a specific field in the profile's ACF data
  function updateField(field, value) {
    setProfile(current => ({
      ...current,
      acf: { ...(current?.acf || {}), [field]: value }
    }))
  }

  // Start editing the profile
  function startEdit() {
    setError('')
    setSuccess('')
    setEditMode(true)
  }

  // Cancel editing the profile and revert changes
  function cancelEdit() {
    if (savedProfile) setProfile(copyProfile(savedProfile))
    setEditMode(false)
    setError('')
    setSuccess('')
  }

  // Save the updated profile to the API
  async function saveProfile(event) {
    event.preventDefault()
    const authHeader = sessionStorage.getItem('fenix_auth')

    if (!authHeader) {
      setError('Du är inte inloggad. Logga in och försök igen.')
      return
    }
    if (!profile) {
      setError('Profilen är inte tillgänglig. Ladda om sidan och försök igen.')
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
      setSuccess('Profilen har uppdaterats!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte uppdatera profilen.')
    } finally {
      setSaving(false)
    }
  }

  // Save the updated password to the API
  async function savePassword(event) {
    event.preventDefault()
    setPasswordError('')

    if (newPassword !== confirmPassword) {
      setPasswordError('De nya lösenorden matchar inte.')
      return
    }

    const authHeader = sessionStorage.getItem('fenix_auth')
    if (!authHeader) {
      setPasswordError('Du är inte inloggad. Logga in och försök igen.')
      return
    }

    setChangingPassword(true)
    try {
      await changePassword(authHeader, currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      onPasswordChanged()
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Kunde inte byta lösenord.')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return <p className="profile-loading">Laddar profil...</p>
  }

  if (error && !profile) {
    return (
      <section className="profile-section">
        <h2>Min profil</h2>
        <p className="error-msg" role="alert">{error}</p>
      </section>
    )
  }

  if (!profile) {
    return (
      <section className="profile-section">
        <h2>Min profil</h2>
        <p className="error-msg" role="alert">Profilen är inte tillgänglig. Ladda om sidan och försök igen.</p>
      </section>
    )
  }

  const acf = profile.acf || {}

  return (
    <section className="profile-section">
      <h2>{editMode ? 'Redigera profil' : 'Min profil'}</h2>
      {error && <p className="error-msg" role="alert">{error}</p>}
      {success && <p className="success-msg" role="status">{success}</p>}

      {editMode ? (
        <form className="profile-form" onSubmit={saveProfile}>
          <div className="form-group">
            <label htmlFor="profile-name">Namn</label>
            <input
              id="profile-name"
              type="text"
              value={profile.name || ''}
              onChange={event => setProfile(current => ({ ...current, name: event.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-email">E-post</label>
            <input
              id="profile-email"
              type="email"
              value={profile.email || ''}
              onChange={event => setProfile(current => ({ ...current, email: event.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-company">Företag</label>
            <input
              id="profile-company"
              type="text"
              value={acf.company || ''}
              onChange={event => updateField('company', event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-phone">Telefon</label>
            <input
              id="profile-phone"
              type="tel"
              value={acf.phone || ''}
              onChange={event => updateField('phone', event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-bio">Om mig</label>
            <textarea
              id="profile-bio"
              value={acf.bio || ''}
              onChange={event => updateField('bio', event.target.value)}
              rows={4}
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-interests">Intressen</label>
            <textarea
              id="profile-interests"
              value={acf.interests || ''}
              onChange={event => updateField('interests', event.target.value)}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-expertise">Är bra på</label>
            <textarea
              id="profile-expertise"
              value={acf.expertise || ''}
              onChange={event => updateField('expertise', event.target.value)}
              placeholder="Vad är du bra på?"
              rows={3}
              maxLength={1000}
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-specific-search">Specifika sök</label>
            <textarea
              id="profile-specific-search"
              value={acf.specific_search || ''}
              onChange={event => updateField('specific_search', event.target.value)}
              placeholder="Vad söker du?"
              rows={3}
              maxLength={1000}
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-deputy">Ersättare</label>
            <input
              id="profile-deputy"
              type="text"
              value={acf.deputy || ''}
              onChange={event => updateField('deputy', event.target.value)}
              placeholder="Namn på ersättare"
              maxLength={200}
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-photo">Länk till foto</label>
            <input
              id="profile-photo"
              type="url"
              value={acf.photo || acf.avatar_url || ''}
              onChange={event => updateField('avatar_url', event.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-linkedin">LinkedIn-länk</label>
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
              {saving ? 'Sparar...' : 'Spara'}
            </button>
            <button
              type="button"
              className="btn-cancel-profile"
              onClick={cancelEdit}
              disabled={saving}
            >
              Avbryt
            </button>
          </div>
        </form>
      ) : (
        <div className="profile-card">
          <div className="profile-photo-wrap">
            {(acf.photo || acf.avatar_url) ? (
              <img src={acf.photo || acf.avatar_url} alt={`Profilbild för ${profile.name || 'användaren'}`} className="profile-photo" />
            ) : (
              <div className="profile-avatar" aria-label="Platshållare för profilbild">
                {(profile.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h3 className="profile-name">{profile.name || 'Inte angivet'}</h3>
          <p className="profile-role">{getRole(profile)}</p>
          <p className="profile-company">{acf.company || 'Inte angivet'}</p>

          <table className="profile-table">
            <tbody>
              <tr><th scope="row">E-post</th><td>{profile.email || 'Inte angivet'}</td></tr>
              <tr><th scope="row">Telefon</th><td>{acf.phone || 'Inte angivet'}</td></tr>
              <tr><th scope="row">Om mig</th><td>{acf.bio || 'Inte angivet'}</td></tr>
              <tr><th scope="row">Intressen</th><td>{acf.interests || 'Inte angivet'}</td></tr>
              <tr><th scope="row">Är bra på</th><td className="profile-multiline">{acf.expertise || 'Inte angivet'}</td></tr>
              <tr><th scope="row">Specifika sök</th><td className="profile-multiline">{acf.specific_search || 'Inte angivet'}</td></tr>
              <tr><th scope="row">Ersättare</th><td>{acf.deputy || 'Inte angivet'}</td></tr>
              <tr>
                <th scope="row">LinkedIn</th>
                <td>
                  {acf.linkedin ? (
                    <a href={acf.linkedin} target="_blank" rel="noopener noreferrer">{acf.linkedin}</a>
                  ) : 'Inte angivet'}
                </td>
              </tr>
            </tbody>
          </table>

          <button type="button" className="btn-edit-profile" onClick={startEdit}>Redigera profil</button>
        </div>
      )}

      <form className="password-form" onSubmit={savePassword}>
        <h3>Byt lösenord</h3>
        <p>När du har bytt lösenord behöver du logga in igen.</p>
        {passwordError && <p className="error-msg" role="alert">{passwordError}</p>}
        <div className="form-group">
          <label htmlFor="profile-current-password">Nuvarande lösenord</label>
          <input
            id="profile-current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={event => setCurrentPassword(event.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="profile-new-password">Nytt lösenord (minst 8 tecken)</label>
          <input
            id="profile-new-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={newPassword}
            onChange={event => setNewPassword(event.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="profile-confirm-password">Bekräfta nytt lösenord</label>
          <input
            id="profile-confirm-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-save-profile" disabled={changingPassword}>
          {changingPassword ? 'Byter...' : 'Byt lösenord'}
        </button>
      </form>
    </section>
  )
}

export default ProfileTab
