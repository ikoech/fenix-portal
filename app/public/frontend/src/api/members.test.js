import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { updateMember } from './members.js'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

test('profile update sends company and multiline profile fields to the existing endpoint', async () => {
  const data = {
    name: 'Member',
    email: 'member@example.com',
    acf: { company: 'Company', expertise: 'First line\nSecond line', specific_search: 'One\nTwo' }
  }
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/fenix\/v1\/users\/42$/)
    assert.equal(options.method, 'POST')
    assert.equal(options.headers.Authorization, 'test-authorization')
    assert.deepEqual(JSON.parse(options.body), data)
    return { ok: true, json: async () => data }
  }
  assert.deepEqual(await updateMember('test-authorization', 42, data), data)
})

test('profile update surfaces backend errors', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 400, json: async () => ({ message: 'Maximum 1000 characters' }) })
  await assert.rejects(updateMember('test-authorization', 42, { acf: {} }), /1000 characters/)
})
