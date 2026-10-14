import { useState, useEffect } from 'react'
import { fetchMembers } from '../api/members'
import '../css/MembersTab.css'

function MembersTab() {
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isCurrent = true
    const authHeader = sessionStorage.getItem('fenix_auth')
    if (!authHeader) {
      setError('Not logged in. Please log in again.')
      setLoading(false)
      return
    }

    // Fetch members from the API and handle loading, error, and data states
    fetchMembers(authHeader)
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
      member.email,
      member.first_name,
      member.last_name,
      member.nickname,
      member.user_login,
      ...(Array.isArray(member.roles) ? member.roles : []),
      member.acf
    ]
    const searchableText = normalizeSearchText(
      collectSearchableText(searchableValues).join(' ')
    )
    return searchTerms.every(term => searchableText.includes(term))
  })

  // Render the members section with search functionality and error/loading states
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
                  {(member.acf?.photo || member.acf?.avatar_url) ? (
                    <img src={member.acf.photo || member.acf.avatar_url} alt={member.name} className="member-image" />
                  ) : (
                    <div className="member-avatar">
                      {(member.name || 'M').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="member-info">
                  <h3 className="member-name">{member.name || 'Unknown'}</h3>
                  {(member.acf?.role || member.roles?.length > 0) && (
                    <p className="member-role">{member.acf?.role || member.roles.join(', ')}</p>
                  )}
                  {member.acf?.company && <p className="member-company">{member.acf.company}</p>}
                  {member.acf?.industry && <p className="member-industry">{member.acf.industry}</p>}
                  {member.acf?.bio && <p className="member-bio">{member.acf.bio}</p>}
                  {member.acf?.phone && <p className="member-phone">Phone: {member.acf.phone}</p>}
                  {member.acf?.interests && <p className="member-interests">Interests: {member.acf.interests}</p>}
                  {member.email && <p className="member-email"><a href={`mailto:${member.email}`}>{member.email}</a></p>}
                  {member.acf?.website && (
                    <p className="member-website">
                      <a href={member.acf.website} target="_blank" rel="noopener noreferrer">Website</a>
                    </p>
                  )}
                </div>

                <div className="member-actions">
                  {member.email && <a href={`mailto:${member.email}`} className="btn-contact">Contact</a>}
                  {member.acf?.linkedin && (
                    <a href={member.acf.linkedin} target="_blank" rel="noopener noreferrer" className="btn-linkedin">LinkedIn</a>
                  )}
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