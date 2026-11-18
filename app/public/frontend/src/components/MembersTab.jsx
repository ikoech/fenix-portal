import { useState, useEffect } from 'react'
import { fetchMembers } from '../api/members'
import '../css/MembersTab.css'

function MemberPhoto({ member, className = '' }) {
  if (member.acf?.photo) {
    return <img src={member.acf.photo} alt={member.name || 'Member'} className={className} />
  }

  return (
    <div className={`${className} member-avatar`} aria-hidden="true">
      {(member.name || 'M').charAt(0).toUpperCase()}
    </div>
  )
}

function MemberDetails({ member, onBack }) {
  const { acf = {} } = member
  const contactItems = [
    ['Telefon', acf.phone, false],
    ['E-post', member.email, false],
    ['LinkedIn', acf.linkedin, true],
    ['Webbplats', acf.website, true],
  ]

  return (
    <section className="member-detail-view">
      <div className="member-detail-banner">
        <button type="button" className="member-detail-back" onClick={onBack}>
          <span aria-hidden="true">←</span> Tillbaka till medlemmar
        </button>
        <h2>{member.name || 'Medlem'}</h2>
        {acf.company && <p>{acf.company}</p>}
      </div>

      <div className="member-detail-layout">
        <article className="member-detail-copy">
          {acf.company && <p className="member-detail-company">{acf.company}</p>}
          {acf.bio ? <p>{acf.bio}</p> : <p>Information om medlemmen kommer snart.</p>}
          {acf.industry && (
            <div className="member-detail-industry">
              <strong>Bransch</strong>
              <span>{acf.industry}</span>
            </div>
          )}
        </article>

        <aside className="member-detail-card" aria-label={`Kontaktuppgifter för ${member.name}`}>
          <div className="member-detail-identity">
            <MemberPhoto member={member} className="member-detail-photo" />
            <div>
              <h3>{member.name || 'Medlem'}</h3>
              {acf.role && <p>{acf.role}</p>}
            </div>
          </div>

          <dl className="member-detail-contact">
            {contactItems.map(([label, value, isExternal]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {!value ? (
                    <span className="member-detail-unavailable">Ej angiven</span>
                  ) : isExternal ? (
                    <a href={value} target="_blank" rel="noopener noreferrer">{value}</a>
                  ) : label === 'E-post' ? (
                    <a href={`mailto:${value}`}>{value}</a>
                  ) : label === 'Telefon' ? (
                    <a href={`tel:${value}`}>{value}</a>
                  ) : value}
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </section>
  )
}

function MembersTab() {
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedMember, setSelectedMember] = useState(null)

  useEffect(() => {
    let isCurrent = true

    // Fetch members from the API and handle loading, error, and data states
    fetchMembers()
      .then(data => {
        if (!isCurrent) return
        if (!Array.isArray(data)) {
          throw new Error('The members response was not a list.')
        }
        setMembers(data)
      })
      .catch(err => {
        if (isCurrent) setError(err.message)
      })
      .finally(() => {
        if (isCurrent) setLoading(false)
      })

    return () => { isCurrent = false }
  }, [])

  // Normalize and prepare the search query for comparison
  const normalizeSearchText = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')

  const query = normalizeSearchText(search).trim()
  const searchTerms = query.split(/\s+/).filter(Boolean)

  // Recursively collect all string values from an object or array for searching
  const collectSearchableText = value => {
    if (value == null) return []
    if (typeof value === 'string' || typeof value === 'number') {
      return [String(value)]
    }
    if (Array.isArray(value)) {
      return value.flatMap(collectSearchableText)
    }
    if (typeof value === 'object') {
      return Object.values(value).flatMap(collectSearchableText)
    }
    return []
  }

  // Filter members based on the search terms
  const filtered = members.filter(member => {
    if (searchTerms.length === 0) return true

    const searchableValues = [
      member.name,
      member.acf
    ]
    const searchableText = normalizeSearchText(
      collectSearchableText(searchableValues).join(' ')
    )
    return searchTerms.every(term => searchableText.includes(term))
  })

  if (selectedMember) {
    return (
      <MemberDetails
        member={selectedMember}
        onBack={() => setSelectedMember(null)}
      />
    )
  }

  return (
    <section className="members-section">
      <h2>TEAM MEMBER</h2>
      <p className="members-subtitle">
        Connect with our network of professionals
      </p>

      {error && <p className="error-msg">{error}</p>}

      <div className="members-search">
        <input
          type="text"
          aria-label="Search members"
          placeholder="Search by name, company, or bio..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="loading-msg">Loading members...</p>
      ) : !error && (
        filtered.length === 0 ? (
          <p className="empty-msg">
            {query ? 'No members match your search.' : 'No members found.'}
          </p>
        ) : (
          <div className="members-grid">
            {filtered.map(member => (
              <div className="member-card" key={member.id}>
                <div className="member-image-wrap">
                  <MemberPhoto member={member} className="member-image" />
                </div>

                <div className="member-info">
                  <h3 className="member-name">{member.name || 'Unknown'}</h3>
                  {member.acf?.company && <p className="member-company">{member.acf.company}</p>}
                  <p className="member-bio">
                    {member.acf?.bio || 'Läs mer om denna medlem och företaget.'}
                  </p>
                </div>

                <div className="member-actions">
                  <button
                    type="button"
                    className="btn-read-more"
                    onClick={() => setSelectedMember(member)}
                    aria-label={`Read more about ${member.name || 'this member'}`}
                  >
                    Läs mer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </section>
  )
}

export default MembersTab