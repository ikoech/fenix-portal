import { useEffect, useState } from 'react'
import { listApplications, reviewApplication } from '../api/applications'
import '../css/ApplicationsAdmin.css'

const fieldLabels = [
  ['fornamn', 'Förnamn'],
  ['efternamn', 'Efternamn'],
  ['e-postadress', 'E-postadress'],
  ['telefonnummer', 'Telefonnummer'],
  ['foretagsnamn', 'Företag'],
  ['organisationsnummer', 'Organisationsnummer'],
  ['roll', 'Roll/Titel'],
  ['bransch', 'Expertområde/Bransch'],
  ['referenser', 'Referenser']
]

const stateLabels = {
  pending: 'Väntar på beslut',
  provisioning: 'Godkännande påbörjat',
  approved: 'Godkänd',
  rejected: 'Avvisad'
}

function ApplicationsAdmin() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    listApplications(sessionStorage.getItem('fenix_auth'), controller.signal)
      .then(setApplications)
      .catch(err => { if (!controller.signal.aborted) setError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  const refresh = async () => {
    setLoading(true)
    try {
      setApplications(await listApplications(sessionStorage.getItem('fenix_auth')))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id, action) => {
    if (busy !== null) return
    const message = action === 'approve'
      ? 'Godkänn ansökan och skapa ett medlemskonto?'
      : action === 'reject'
        ? 'Avvisa ansökan?'
        : 'Försök skicka beskedet igen?'
    if (!window.confirm(message)) return
    setBusy(id)
    setError('')
    try {
      const updated = await reviewApplication(sessionStorage.getItem('fenix_auth'), id, action)
      setApplications(current => current.map(item => item.id === id ? updated : item))
    } catch (err) {
      setError(err.message)
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="applications-admin" aria-labelledby="applications-heading">
      <h3 id="applications-heading">Medlemsansökningar</h3>
      {error && <p className="error-msg" role="alert">{error}</p>}
      {loading && <p role="status">Laddar ansökningar...</p>}
      {!loading && error && <button type="button" onClick={refresh} disabled={busy !== null}>Uppdatera listan</button>}
      {!loading && !error && applications.length === 0 && <p>Inga ansökningar ännu.</p>}
      {applications.map(application => (
        <article className="application-review" key={application.id}>
          <h4>{application.fields.fornamn} {application.fields.efternamn}</h4>
          <p>Inkommen: {application.date}</p>
          <p>Status: {stateLabels[application.state] || application.state}</p>
          {(application.state === 'approved' || application.state === 'rejected') && (
            <p>E-post: {application.mail_state === 'sent' ? 'Avsänd (leverans ej bekräftad)' : 'Inte skickad'}</p>
          )}
          <dl>
            {fieldLabels.map(([key, label]) => (
              <div key={key}><dt>{label}</dt><dd>{application.fields[key]}</dd></div>
            ))}
            <div><dt>Villkor godkända</dt><dd>{application.fields.samtycke_godkant ? 'Ja' : 'Nej'}</dd></div>
          </dl>
          <div className="application-actions">
            {(application.state === 'pending' || application.state === 'provisioning') && (
              <button type="button" className="btn-approve" disabled={busy !== null || loading} onClick={() => handleAction(application.id, 'approve')}>
                {application.state === 'provisioning' ? 'Fortsätt godkänna' : 'Godkänn'}
              </button>
            )}
            {(application.state === 'pending' || (application.state === 'provisioning' && !application.account_created)) && (
              <button type="button" className="btn-reject" disabled={busy !== null || loading} onClick={() => handleAction(application.id, 'reject')}>Avvisa</button>
            )}
            {(application.state === 'approved' || application.state === 'rejected') && application.mail_state !== 'sent' && (
              <button type="button" className="btn-approve" disabled={busy !== null || loading} onClick={() => handleAction(application.id, 'notify')}>Skicka besked igen</button>
            )}
          </div>
        </article>
      ))}
    </section>
  )
}

export default ApplicationsAdmin
