import { useState } from 'react'
import { submitApplication } from '../api/applications'
import '../css/ApplicationPage.css'

const fields = [
  { name: 'fornamn', label: 'Förnamn', autoComplete: 'given-name', maxLength: 100 },
  { name: 'efternamn', label: 'Efternamn', autoComplete: 'family-name', maxLength: 100 },
  { name: 'e-postadress', label: 'E-postadress', type: 'email', autoComplete: 'email', maxLength: 100 },
  { name: 'telefonnummer', label: 'Telefonnummer', type: 'tel', autoComplete: 'tel' },
  { name: 'foretagsnamn', label: 'Fullständigt företagsnamn', autoComplete: 'organization' },
  { name: 'organisationsnummer', label: 'Organisationsnummer' },
  { name: 'roll', label: 'Roll/Titel', autoComplete: 'organization-title' },
  { name: 'bransch', label: 'Expertområde/Bransch' },
  { name: 'referenser', label: 'Referenser (Ange 1–3 referenser för din ansökan)', multiline: true, maxLength: 1000 }
]

function ApplicationPage() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async event => {
    event.preventDefault()
    if (submitting) return
    const form = event.currentTarget
    const data = new FormData(form)
    const values = Object.fromEntries(fields.map(field => [field.name, data.get(field.name)]))
    values.samtycke_godkant = data.has('samtycke_godkant')
    setError('')
    setSubmitting(true)
    try {
      await submitApplication(values)
      setSubmitted(true)
      form.reset()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="application-page">
      <header className="application-intro">
        <p className="application-eyebrow">Bli medlem</p>
        <h1>Gå med i Affärsnätverket Fenix</h1>
        <p>Denna anmälan utgör en ansökan om medlemskap i Affärsnätverket Fenix och fungerar, vid godkännande, som avtal mellan medlemmen och nätverket.</p>
        <p>Alla ansökningar behandlas individuellt. Oavsett om ansökan beviljas eller avslås får du återkoppling.</p>
        <p>Handläggningstiden är normalt 2–4 veckor. <a href="/portal?tab=contact">Kontakta oss</a> om du vill delta på nätverkets möten medan din ansökan behandlas.</p>
        <p>Medlemskapet blir bindande först efter att ansökan godkänts av Affärsnätverket Fenix.</p>
        <div className="application-documents">
          <div>Se <a href="/portal?tab=bylaws" target="_blank" rel="noopener noreferrer">stadgar</a></div>
          <div>Se <a href="https://drive.google.com/file/d/1bXucDU_xuNPhc-ri6A3nP4ijMm5NMJSY/view?usp=sharing" target="_blank" rel="noopener noreferrer">styrdokument &amp; regler</a></div>
          <div>Se <a href="https://drive.google.com/file/d/1krLoDuSqO9tXXZcWla2dVyD5mdsaK8vy/view?usp=sharing" target="_blank" rel="noopener noreferrer">medlemsvillkor</a></div>
          <div>Se <a href="/portal?tab=integrity-policy" target="_blank" rel="noopener noreferrer">integritetspolicy</a></div>
        </div>
      </header>

      {submitted ? (
        <p className="application-success" role="status">Tack! Din ansökan har skickats. Vi återkommer när den har behandlats.</p>
      ) : (
        <form className="application-form" onSubmit={handleSubmit}>
          <div className="application-fields">
            {fields.map((field, index) => (
              <div className={`application-field${index < 2 ? ' application-field--half' : ''}`} key={field.name}>
                <label htmlFor={`application-${field.name}`}>{field.label} <span aria-hidden="true">*</span></label>
                {field.multiline ? (
                  <textarea id={`application-${field.name}`} name={field.name} placeholder={field.label.split(' (')[0]} rows="3" maxLength={field.maxLength} required />
                ) : (
                  <input id={`application-${field.name}`} name={field.name} type={field.type || 'text'} placeholder={field.label} autoComplete={field.autoComplete} maxLength={field.maxLength || 200} required />
                )}
              </div>
            ))}
          </div>
          <label className="application-consent">
            <input type="checkbox" name="samtycke_godkant" required />
            <span>Jag godkänner Affärsnätverket Fenix stadgar, styrdokument och regler, medlemsvillkor samt gällande kostnader och samtycker till behandling av mina personuppgifter enligt Affärsnätverket Fenix integritetspolicy (GDPR). Samtliga dokument finns länkade i början av formuläret.</span>
          </label>
          {error && <p className="error-msg" role="alert">{error}</p>}
          <button type="submit" className="application-submit" disabled={submitting}>{submitting ? 'Skickar...' : 'Skicka förfrågan'}</button>
        </form>
      )}
    </section>
  )
}

export default ApplicationPage
