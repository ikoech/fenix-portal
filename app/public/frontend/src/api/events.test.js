import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { fetchEventSignupSummary, addEventGuest } from './events.js'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

test('roster rejects missing auth and sends the existing authorization header', async () => {
  let called = false
  globalThis.fetch = async (url, options) => {
    called = true
    assert.match(url, /\/fenix\/v1\/event-signups$/)
    assert.equal(options.headers.Authorization, '******')
    return { ok: true, json: async () => ({ counts: {}, signupIds: {}, breakdown: {}, attendees: {}, cancelled: {} }) }
  }
  await assert.rejects(fetchEventSignupSummary(''), /Not logged in/)
  assert.equal(called, false)
  await fetchEventSignupSummary('******')
  assert.equal(called, true)
})

test('roster surfaces unauthorized response', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ message: 'Unauthorized' }) })
  await assert.rejects(fetchEventSignupSummary('******'), /Unauthorized/)
})

test('guest request sends trimmed name, email and company', async () => {
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/event-signups\/42\/guests$/)
    assert.equal(options.headers.Authorization, '******')
    assert.deepEqual(JSON.parse(options.body), { name: 'Guest', email: 'guest@example.com', company: 'Example AB' })
    return { ok: true, json: async () => ({ id: 'guest-id', name: 'Guest', email: 'guest@example.com', company: 'Example AB', status: 'pending' }) }
  }
  const guest = await addEventGuest('******', 42, '  Guest  ', ' guest@example.com ', ' Example AB ')
  assert.equal(guest.email, 'guest@example.com')
  assert.equal(guest.status, 'pending')
})

test('guest request surfaces invalid email errors', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 400, json: async () => ({ message: 'Invalid email' }) })
  await assert.rejects(addEventGuest('******', 42, 'Guest', 'invalid'), /Invalid email/)
})
