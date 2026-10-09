import { useState, useEffect } from 'react'
import { fetchSeekingPosts, createSeekingPost, formatACFDate } from '../api'
import '../css/SeekingTab.css'

function SeekingTab({ user }) {
  const [seekingPosts, setSeekingPosts] = useState([])
  const [seekingForm, setSeekingForm] = useState({ description: '', category: 'Supplier' })
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchSeekingPosts()
      .then(data => setSeekingPosts(data))
      .catch(err => setError(err.message))
  }, [])

  // Handle seeking post creationS
  const handleCreateSeeking = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const authHeader = sessionStorage.getItem('fenix_auth')
      const result = await createSeekingPost(authHeader, seekingForm.description, seekingForm.category)
      setSeekingPosts(prev => [result, ...prev])
      setSeekingForm({ description: '', category: 'Supplier' })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="seeking-section">
      <h2>Seeking & Offering</h2>
      <form onSubmit={handleCreateSeeking} className="seeking-form">
        <label>
          What are you looking for?
          <textarea
            value={seekingForm.description}
            onChange={(e) => setSeekingForm({...seekingForm, description: e.target.value})}
            rows="3"
            required
          />
        </label>
        <label>
          Category
          <select
            value={seekingForm.category}
            onChange={(e) => setSeekingForm({...seekingForm, category: e.target.value})}
          >
            <option value="Supplier">Supplier</option>
            <option value="Customer">Customer</option>
            <option value="Partner">Partner</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <button type="submit" className="btn btn-seeking">Post Seeking</button>
      </form>

      <h3>All Seeking Posts</h3>
      {error && <p className="error-msg">{error}</p>}
      {seekingPosts.length === 0 ? (
        <p>No seeking posts yet.</p>
      ) : (
        <ul className="seeking-list">
          {seekingPosts.map(post => (
            <li key={post.id} className={`seeking-card category-${post.acf?.category?.toLowerCase()}`}>
              <span className="category-badge">{post.acf?.category}</span>
              <p>{post.acf?.description}</p>
              <p className="deal-date">{formatACFDate(post.date.substring(0,10).replace(/-/g,''))}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default SeekingTab