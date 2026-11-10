import { useEffect, useMemo, useState } from 'react'
import { fetchMemberDirectory, groupDirectoryRows, downloadCSV, filterMembers } from '../api/directory'
import { getGuestStatus } from '../utils/guestStatus'
import '../css/GuestStatus.css'
import '../css/MemberDirectory.css'

export default function MemberDirectoryTab() {
  const [rows, setRows] = useState([])
  const [members, setMembers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const filteredMembers = useMemo(() => filterMembers(members, searchQuery), [members, searchQuery])
  const [error, setError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let current = true
    async function loadDirectory() {
      try {
        const data = await fetchMemberDirectory(sessionStorage.getItem('fenix_auth'))
        const grouped = groupDirectoryRows(data)
        if (current) {
          setRows(data)
          setMembers(grouped)
        }
      } catch (loadError) {
        if (current) setError(loadError.message)
      } finally {
        if (current) setLoading(false)
      }
    }
    loadDirectory()
    return () => { current = false }
  }, [])

  const handleDownload = () => {
    setDownloadError('')
    try {
      downloadCSV(rows)
    } catch (downloadError) {
      setDownloadError(`CSV-filen kunde inte laddas ner: ${downloadError.message}`)
    }
  }

  return (
    <section className="member-directory">
      <div className="member-directory-header no-print">
        <h2>Medlemskatalog</h2>
        <div className="member-directory-actions">
          <button type="button" disabled={loading || !!error} onClick={() => window.print()}>Skriv ut / spara som PDF</button>
          <button type="button" disabled={loading || !!error} onClick={handleDownload}>Ladda ner CSV</button>
        </div>
      </div>
      {error && <p className="error-msg" role="alert">{error}</p>}
      {downloadError && <p className="error-msg no-print" role="alert">{downloadError}</p>}
      {!loading && !error && (
        <div className="member-directory-search no-print">
          <div className="member-directory-search-field">
            <input
              type="text"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Sök på namn, företag eller kompetens..."
              aria-label="Sök i medlemskatalogen"
            />
            {searchQuery && (
              <button type="button" aria-label="Rensa sökning" onClick={() => setSearchQuery('')}>×</button>
            )}
          </div>
          <p className="member-directory-count" role="status">Visar {filteredMembers.length} av {members.length} medlemmar</p>
        </div>
      )}
      {loading && <p>Hämtar medlemskatalog…</p>}
      {!loading && !error && (
        <div className="member-directory-content print-area">
          <h1 className="member-directory-print-title">Medlemskatalog</h1>
          {members.length === 0 && <p>Inga medlemmar hittades.</p>}
          {members.length > 0 && filteredMembers.length === 0 && <p>Inga medlemmar matchar sökningen.</p>}
          {filteredMembers.map((member, index) => (
            <section className="directory-member-card" key={member.user_id ?? `member-${index}`}>
              <h3>{member.name}</h3>
              <dl className="directory-member-fields">
                <div><dt>Företag</dt><dd>{member.company || '—'}</dd></div>
                <div><dt>Är bra på</dt><dd>{member.expertise || '—'}</dd></div>
                {member.deputy && <div><dt>Ersättare</dt><dd>{member.deputy}</dd></div>}
                <div><dt>Specifika sök</dt><dd>{member.specific_search || '—'}</dd></div>
              </dl>
              {member.guests.length > 0 && (
                <div className="directory-guests">
                  <h4>Gäster ({member.guests.length})</h4>
                  <div className="directory-guest-table-wrap">
                    <table>
                      <thead><tr><th>Namn</th><th>Företag</th><th>E-post</th><th>Inbjuden av</th><th>Status</th></tr></thead>
                      <tbody>
                        {member.guests.map((guest, guestIndex) => (
                          <tr key={`${guest.signup_id ?? 'signup'}-${guest.id ?? guestIndex}`}>
                            <td>{guest.guest_name || guest.name}</td>
                            <td>{guest.company || '—'}</td>
                            <td>{guest.guest_email || '—'}</td>
                            <td>{guest.invited_by || member.name}</td>
                            <td>
                              <span className={getGuestStatus(guest).className}>{getGuestStatus(guest).label}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </section>
  )
}
