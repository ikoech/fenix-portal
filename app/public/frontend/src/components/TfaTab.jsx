import { useState, useEffect } from 'react'
import { fetchTFADeals, createTFADeal } from '../api/tfa'
import { formatACFDate } from '../utils/date'
import '../css/TfaTab.css'

const API_BASE = 'http://fenix-portal.local/wp-json/wp/v2'

// Digits only, per the form specification ("ange endast siffror utan mellanslag")
const parseAmount = value => {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits ? parseInt(digits, 10) : NaN
}

function TfaTab({ user }) {
  const [tfaDeals, setTfaDeals] = useState([])
  const [members, setMembers] = useState([])
  const [filter, setFilter] = useState('all')
  const [dealForm, setDealForm] = useState({ toMember: '', amount: '', description: '' })
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const authHeader = sessionStorage.getItem('fenix_auth')

    fetchTFADeals(authHeader)
      .then(data => setTfaDeals(Array.isArray(data) ? data : []))
      .catch(err => setError(err.message))

    // Fields limits exposure — no emails or other sensitive user data in the browser
    fetch(`${API_BASE}/users?per_page=100&_fields=id,name`, {
      headers: { Authorization: authHeader }
    })
      .then(res =>
        res.ok ? res.json() : Promise.reject(new Error(`Kunde inte hämta medlemslistan (${res.status})`))
      )
      .then(data => setMembers(Array.isArray(data) ? data : []))
      .catch(err => console.warn('Members fetch failed:', err.message))
  }, [])
  // Helper to get member name by ID
  const memberName = id => {
    const m = members.find(mem => mem.id === Number(id))
    return m?.name || `Medlem #${id}`
  }

  // Fallback: resolve names from ACF's embedded user objects on each deal
  const memberNameFromDeal = (deal, id) => {
    const users = deal._embedded?.['acf:user'] || []
    const match = users.find(u => u.id === Number(id))
    return match?.name || memberName(id)
  }
  // Handle form submission for creating a new TFA deal
  const handleCreateDeal = async e => {
    e.preventDefault()
    setError(null)
    setNotice(null)

    const toMember = parseInt(dealForm.toMember, 10)
    if (!Number.isFinite(toMember) || toMember <= 0) {
      setError('Välj en mottagare.')
      return
    }
    if (toMember === user.id) {
      setError('Du kan inte ge TFA till dig själv.')
      return
    }
    // Validate amount field
    const amount = parseAmount(dealForm.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Ange beloppet som bara siffror, utan mellanslag (t.ex. 50000).')
      return
    }
    // Validate description field
    setSubmitting(true)
    try {
      const authHeader = sessionStorage.getItem('fenix_auth')
      const result = await createTFADeal(authHeader, user.id, toMember, amount, dealForm.description.trim())
      setTfaDeals(prev => [result, ...prev])
      setDealForm({ toMember: '', amount: '', description: '' })
      setNotice('TFA registrerad. Tack!')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }
  // Compute received, given, and total TFA deals for the current user
  const received = tfaDeals.filter(d => Number(d.acf?.to_member) === user.id)
  const given = tfaDeals.filter(d => Number(d.acf?.from_member) === user.id)
  const sum = deals => deals.reduce((acc, d) => acc + (parseAmount(d.acf?.deal_amount) || 0), 0)
  const fmt = n => n.toLocaleString('sv-SE')

  // Filter visible deals based on the selected filter
  const visibleDeals = tfaDeals.filter(d =>
    filter === 'received' ? Number(d.acf?.to_member) === user.id :
    filter === 'given' ? Number(d.acf?.from_member) === user.id : true
  )

  const filters = [
    { key: 'all', label: 'Alla' },
    { key: 'received', label: 'Mottagna' },
    { key: 'given', label: 'Givna' }
  ]

  return (
    <section className="tfa-section">
      <h2>Tack för affären</h2>

      <div className="tfa-stats">
        <div className="tfa-stat-card">
          <span className="tfa-stat-label">Mottagna TFA</span>
          <span className="tfa-stat-value">{received.length}</span>
          <span className="tfa-stat-sub">{fmt(sum(received))} kr</span>
        </div>
        <div className="tfa-stat-card">
          <span className="tfa-stat-label">Givna TFA</span>
          <span className="tfa-stat-value">{given.length}</span>
          <span className="tfa-stat-sub">{fmt(sum(given))} kr</span>
        </div>
        <div className="tfa-stat-card tfa-stat-total">
          <span className="tfa-stat-label">Totalt i nätverket</span>
          <span className="tfa-stat-value">{fmt(sum(tfaDeals))} kr</span>
        </div>
      </div>

      <form onSubmit={handleCreateDeal} className="deal-form">
        <label>
          Från
          <input type="text" value={user.name} disabled />
        </label>

        <label>
          Till (mottagare av TFA)
          {members.length > 0 ? (
            <select
              value={dealForm.toMember}
              onChange={e => setDealForm({ ...dealForm, toMember: e.target.value })}
              required
            >
              <option value="">Välj medlem…</option>
              {members
                .filter(m => m.id !== user.id)
                .map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          ) : (
            <input
              type="number"
              min="1"
              placeholder="Medlems-ID"
              value={dealForm.toMember}
              onChange={e => setDealForm({ ...dealForm, toMember: e.target.value })}
              required
            />
          )}
        </label>

        <label>
          Belopp (siffror utan mellanslag)
          <input
            type="text"
            inputMode="numeric"
            pattern="\d*"
            placeholder="t.ex. 50000"
            value={dealForm.amount}
            onChange={e => setDealForm({ ...dealForm, amount: e.target.value })}
            required
          />
        </label>

        <label>
          Beskrivning (valfritt)
          <textarea
            rows={2}
            maxLength={300}
            placeholder="t.ex. Webbplats åt Eve Adams"
            value={dealForm.description}
            onChange={e => setDealForm({ ...dealForm, description: e.target.value })}
          />
        </label>

        <button type="submit" className="btn btn-deal" disabled={submitting}>
          {submitting ? 'Sparar…' : 'Record Deal'}
        </button>
      </form>

      <h3>All Deals</h3>

      <div className="tfa-filters" role="group" aria-label="Filtrera affärer">
        {filters.map(f => (
          <button
            key={f.key}
            type="button"
            className={`tfa-filter${filter === f.key ? ' active' : ''}`}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="error-msg" role="alert">{error}</p>}
      {notice && <p className="success-msg" role="status">{notice}</p>}

      {visibleDeals.length === 0 ? (
        <p>No business to display.</p>
      ) : (
        <ul className="deal-list">
          {visibleDeals.map(deal => {
            const isMine = Number(deal.acf?.to_member) === user.id
            return (
              <li key={deal.id} className="deal-card">
                <p className="deal-parties">
                  <strong>{memberNameFromDeal(deal, deal.acf?.from_member)}</strong> →{' '}
                  <strong>{memberNameFromDeal(deal, deal.acf?.to_member)}</strong>
                  {isMine && <span className="deal-badge">Till dig</span>}
                </p>
                <p className="deal-amount">
                  Amount: {fmt(parseAmount(deal.acf?.deal_amount) || 0)} kr
                </p>
                {deal.acf?.deal_description && (
                  <p className="deal-desc">{deal.acf.deal_description}</p>
                )}
                <p className="deal-date">
                  {formatACFDate(deal.date.substring(0, 10).replace(/-/g, ''))}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default TfaTab