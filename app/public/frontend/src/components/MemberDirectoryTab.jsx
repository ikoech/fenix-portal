import { useEffect, useMemo, useState } from 'react'
import { fetchMemberDirectory, groupDirectoryRows, downloadCSV, filterMembers, shortenExpertise } from '../api/directory'
import { getGuestStatus } from '../utils/guestStatus'
import '../css/GuestStatus.css'
import '../css/MemberDirectory.css'

export default function MemberDirectoryTab() {
  const [rows, setRows] = useState([])
  const [members, setMembers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const filteredMembers = useMemo(() => filterMembers(members, searchQuery), [members, searchQuery])
  const filteredGuests = useMemo(
    () => filteredMembers.flatMap(member => member.guests.map(guest => ({ guest, member }))),
    [filteredMembers]
  )
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
          {filteredMembers.length > 0 && (
            <>
              <section className="directory-list" aria-labelledby="directory-members-title">
                <h3 id="directory-members-title">Medlemmar <span>{filteredMembers.length}</span></h3>
                <div className="directory-table-wrap" role="region" aria-label="Medlemmar" tabIndex={0}>
                  <table>
                    <thead>
                      <tr><th scope="col">Nr</th><th scope="col">Namn</th><th scope="col">Företag</th><th scope="col">Är bra på</th><th scope="col">Ersättare</th><th scope="col">Specifika sök</th></tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((member, index) => {
                        const shortExpertise = shortenExpertise(member.expertise)
                        const isShortened = shortExpertise !== String(member.expertise ?? '').replace(/\s+/g, ' ').trim()
                        return (
                          <tr key={member.user_id ?? `member-${index}`}>
                            <td>{index + 1}</td>
                            <th scope="row">{member.name}</th>
                            <td>{member.company || '—'}</td>
                            <td>
                              {isShortened ? (
                                <>
                                  <details className="directory-expertise no-print">
                                    <summary>
                                      <span className="directory-expertise-preview">{shortExpertise} </span>
                                      <span className="directory-expertise-more">Visa mer</span>
                                      <span className="directory-expertise-less">Visa mindre</span>
                                    </summary>
                                    <p>{member.expertise}</p>
                                  </details>
                                  <span className="directory-print-expertise">{member.expertise}</span>
                                </>
                              ) : shortExpertise || '—'}
                            </td>
                            <td>{member.deputy || '—'}</td>
                            <td>{member.specific_search || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="directory-list" aria-labelledby="directory-guests-title">
                <h3 id="directory-guests-title">Gäster <span>{filteredGuests.length}</span></h3>
                {filteredGuests.length === 0 ? <p>Inga gäster hittades.</p> : (
                  <div className="directory-table-wrap" role="region" aria-label="Gäster" tabIndex={0}>
                    <table>
                      <thead>
                        <tr><th scope="col">Nr</th><th scope="col">Namn</th><th scope="col">Företag</th><th scope="col">E-post</th><th scope="col">Inbjuden av</th><th scope="col">Status</th></tr>
                      </thead>
                      <tbody>
                        {filteredGuests.map(({ guest, member }, index) => (
                          <tr key={`${guest.signup_id ?? 'signup'}-${guest.id ?? index}`}>
                            <td>{index + 1}</td>
                            <th scope="row">{guest.guest_name || guest.name}</th>
                            <td>{guest.company || '—'}</td>
                            <td>{guest.guest_email || '—'}</td>
                            <td>{guest.invited_by || member.name}</td>
                            <td><span className={getGuestStatus(guest).className}>{getGuestStatus(guest).label}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}
    </section>
  )
}
