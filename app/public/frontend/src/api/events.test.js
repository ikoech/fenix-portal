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
    assert.equal(options.headers.Authorization, 'Bearer example')
    return { ok: true, json: async () => ({ counts: {}, signupIds: {}, breakdown: {}, attendees: {}, cancelled: {} }) }
  }
  await assert.rejects(fetchEventSignupSummary(''), /Not logged in/)
  assert.equal(called, false)
  await fetchEventSignupSummary('Bearer example')
  assert.equal(called, true)
})

test('roster surfaces unauthorized response', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ message: 'Unauthorized' }) })
  await assert.rejects(fetchEventSignupSummary('Bearer invalid'), /Unauthorized/)
})

test('guest request sends only the trimmed name, not a member identity', async () => {
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/event-signups\/42\/guests$/)
    assert.equal(options.headers.Authorization, 'Bearer example')
    assert.deepEqual(JSON.parse(options.body), { name: 'Guest' })
    return { ok: true, json: async () => ({ id: 'guest-id', name: 'Guest' }) }
  }
  assert.equal((await addEventGuest('Bearer example', 42, '  Guest  ')).name, 'Guest')
})
