import { useState, useEffect } from 'react'
import { fetchTFADeals, createTFADeal, formatACFDate } from '../api'
import '../css/TfaTab.css'

function TfaTab({ user }) {
  const [tfaDeals, setTfaDeals] = useState([])
  const [dealForm, setDealForm] = useState({ toMember: '', amount: '' })
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTFADeals()
      .then(data => setTfaDeals(data))
      .catch(err => setError(err.message))
  }, [])
  
  // Handle deal creation
  const handleCreateDeal = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const authHeader = sessionStorage.getItem('fenix_auth')
      const result = await createTFADeal(authHeader, user.id, parseInt(dealForm.toMember), dealForm.amount)
      setTfaDeals(prev => [result, ...prev])
      setDealForm({ toMember: '', amount: '' })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="tfa-section">
      <h2>Tack för affären — Business Exchange</h2>
      <form onSubmit={handleCreateDeal} className="deal-form">
        <label>
          To Member ID
          <input
            type="number"
            value={dealForm.toMember}
            onChange={(e) => setDealForm({...dealForm, toMember: e.target.value})}
            required
          />
        </label>
        <label>
          Deal Amount
          <input
            type="text"
            placeholder="e.g. 50 000 SEK"
            value={dealForm.amount}
            onChange={(e) => setDealForm({...dealForm, amount: e.target.value})}
            required
          />
        </label>
        <button type="submit" className="btn btn-deal">Record Deal</button>
      </form>

      <h3>All Deals</h3>
      {error && <p className="error-msg">{error}</p>}
      {tfaDeals.length === 0 ? (
        <p>No deals recorded yet.</p>
      ) : (
        <ul className="deal-list">
          {tfaDeals.map(deal => (
            <li key={deal.id} className="deal-card">
              <p><strong>{deal.acf?.from_member}</strong> → <strong>{deal.acf?.to_member}</strong></p>
              <p>Amount: {deal.acf?.deal_amount || 'N/A'}</p>
              <p className="deal-date">{formatACFDate(deal.date.substring(0,10).replace(/-/g,''))}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default TfaTab