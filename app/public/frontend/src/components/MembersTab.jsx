import { useState, useEffect } from 'react'
import { fetchMembers } from '../api'
import '../css/MembersTab.css'

function MembersTab({ user }) {
  const [members, setMembers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchMembers()
      .then(data => setMembers(data))
      .catch(err => setError(err.message))
  }, [])

const filteredMembers = members.filter(m => {
  console.log('Checking member:', m.name, 'against query:', searchQuery)
  return m.name.toLowerCase().includes(searchQuery.toLowerCase())
})

  if (selectedMember) {
    const acf = selectedMember.acf || {}
    return (
      <section className="profile-section">
        <button onClick={() => setSelectedMember(null)} className="btn btn-back">← Back to Members</button>
        <div className="profile-card">
          <div className="profile-header">
            {acf.company_logo ? (
              <img src={acf.company_logo} alt={acf.company || 'Company'} className="profile-logo" />
            ) : (
              <div className="profile-logo-placeholder">
                {(acf.company || selectedMember.name).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="profile-header-info">
              <h3>{selectedMember.name}</h3>
              <p className="profile-company">{acf.company || 'Not set'}</p>
              {acf.industry && <p className="profile-industry">{acf.industry}</p>}
            </div>
          </div>

          {acf.website && (
            <a href={acf.website} target="_blank" rel="noopener noreferrer" className="profile-website">
              Läs mer →
            </a>
          )}

          <table className="profile-table">
            <tbody>
              <tr><td>Company</td><td>{acf.company || 'Not set'}</td></tr>
              <tr><td>Industry</td><td>{acf.industry || 'Not set'}</td></tr>
              <tr><td>Phone</td><td>{acf.phone || 'Not set'}</td></tr>
              <tr><td>Email</td><td>{acf.email || selectedMember.email || 'Not set'}</td></tr>
              <tr><td>Bio</td><td>{acf.bio || 'No bio yet.'}</td></tr>
              <tr><td>Interests</td><td>{acf.interests || 'Not set'}</td></tr>
              {acf.website && <tr><td>Website</td><td><a href={acf.website} target="_blank" rel="noopener noreferrer">{acf.website}</a></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  return (
    <section className="members-section">
      <h2>All Members</h2>
      {error && <p className="error-msg">{error}</p>}
      <input
        type="text"
        placeholder="Search by name, company or interests..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-input"
      />
      {filteredMembers.length === 0 ? (
        <p>No members found.</p>
      ) : (
        <ul className="member-list">
          {filteredMembers.map(member => {
            const acf = member.acf || {}
            return (
              <li key={member.id} className="member-card" onClick={() => setSelectedMember(member)}>
                <div className="member-avatar">
                  {acf.company_logo ? (
                    <img src={acf.company_logo} alt={acf.company || member.name} />
                  ) : acf.avatar_url ? (
                    <img src={acf.avatar_url} alt={member.name} />
                  ) : (
                    <span className="avatar-placeholder">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="member-info">
                  <h3>{member.name}</h3>
                  <p>{acf.company || 'No company set'}</p>
                  {acf.industry && <p className="member-industry">{acf.industry}</p>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default MembersTab