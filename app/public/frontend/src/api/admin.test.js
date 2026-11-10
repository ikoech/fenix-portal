import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { getPendingGuests, approveGuest, rejectGuest } from './admin.js'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

test('pending guest requests use the portal authorization header and no cache', async () => {
  const controller = new AbortController()
  const guests = [{ id: 'guest-1', name: 'Guest', event_name: 'Meeting' }]
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/fenix\/v1\/guests\/pending$/)
    assert.equal(options.headers.Authorization, 'test-authorization')
    assert.equal(options.cache, 'no-store')
    assert.equal(options.signal, controller.signal)
    return { ok: true, json: async () => guests }
  }
  assert.deepEqual(await getPendingGuests('test-authorization', controller.signal), guests)
})

test('approval and rejection post to their encoded guest routes', async () => {
  const paths = []
  globalThis.fetch = async (url, options) => {
    paths.push(url)
    assert.equal(options.method, 'POST')
    assert.equal(options.headers.Authorization, 'test-authorization')
    return { ok: true, json: async () => ({ status: 'ok' }) }
  }
  await approveGuest('test-authorization', 'id/one')
  await rejectGuest('test-authorization', 'id/two')
  assert.match(paths[0], /\/guests\/id%2Fone\/approve$/)
  assert.match(paths[1], /\/guests\/id%2Ftwo\/reject$/)
})

test('guest requests surface auth, capacity and response errors', async () => {
  let called = false
  globalThis.fetch = async () => {
    called = true
    return { ok: false, status: 409, json: async () => ({ message: 'Eventet är fullbokat.' }) }
  }
  await assert.rejects(getPendingGuests(''), /Logga in/)
  assert.equal(called, false)
  await assert.rejects(approveGuest('test-authorization', 'one'), /Eventet är fullbokat/)
  globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({}) })
  await assert.rejects(rejectGuest('test-authorization', 'one'), /403/)
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ message: 'not an array' }) })
  await assert.rejects(getPendingGuests('test-authorization'), /inte en gästlista/)
})
