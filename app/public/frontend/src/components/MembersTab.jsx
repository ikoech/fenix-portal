import { useState, useEffect } from 'react'
import { fetchMembers } from '../api'

function MembersTab({ user }) {
  const [members, setMembers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [error, setError] = useState(null)

  // Fetch members on component mount
  useEffect(() => {
    fetchMembers()
      .then(data => setMembers(data))
      .catch(err => setError(err.message))
  }, [])
  // Filter members based on search query
  const filteredMembers = members.filter(m => {
    const q = searchQuery.toLowerCase()
    const name = m.name?.toLowerCase() || ''
    const company = m.acf?.company?.toLowerCase() || ''
    const interests = m.acf?.interests?.toLowerCase() || ''
    return name.includes(q) || company.includes(q) || interests.includes(q)
  })
  // Show selected member profile if one is selected
  if (selectedMember) {
    return (
      <section className="profile-section">
        <button onClick={() => setSelectedMember(null)} className="btn btn-back">← Back to Members</button>
        <div className="profile-card">
          <h3>{selectedMember.name}</h3>
          <table className="profile-table">
            <tbody>
              <tr><td>Company</td><td>{selectedMember.acf?.company || 'Not set'}</td></tr>
              <tr><td>Phone</td><td>{selectedMember.acf?.phone || 'Not set'}</td></tr>
              <tr><td>Bio</td><td>{selectedMember.acf?.bio || 'No bio yet.'}</td></tr>
              <tr><td>Interests</td><td>{selectedMember.acf?.interests || 'Not set'}</td></tr>
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
          {filteredMembers.map(member => (
            <li key={member.id} className="member-card" onClick={() => setSelectedMember(member)}>
              <div className="member-avatar">
                {member.acf?.avatar_url ? (
                  <img src={member.acf.avatar_url} alt={member.name} />
                ) : (
                  <span className="avatar-placeholder">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="member-info">
                <h3>{member.name}</h3>
                <p>{member.acf?.company || 'No company set'}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default MembersTab