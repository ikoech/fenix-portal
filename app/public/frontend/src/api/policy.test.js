import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { fetchIntegrityPolicy } from './policy.js'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

test('fetches the integrity policy from the WordPress API', async () => {
  const policy = { policy_heading: 'Integritetspolicy', section_heading_1: 'Information', section_1_content: 'Text' }
  globalThis.fetch = async url => {
    assert.equal(url, '/wp-json/wp/v2/integritetspolicy?per_page=1')
    return { ok: true, json: async () => [{ acf: policy }] }
  }
  assert.deepEqual(await fetchIntegrityPolicy(), policy)
})

test('surfaces integrity policy request failures', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 404 })
  await assert.rejects(fetchIntegrityPolicy(), /Failed to fetch privacy policy: 404/)
})

test('reports an unpublished policy', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => [] })
  await assert.rejects(fetchIntegrityPolicy(), /Inget inlägg.*publicerat/)
})

test('reports an invalid response', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({}) })
  await assert.rejects(fetchIntegrityPolicy(), /Ogiltigt svar/)
})

test('reports missing or empty policy fields', async () => {
  for (const page of [{}, { acf: { policy_heading: '' } }]) {
    globalThis.fetch = async () => ({ ok: true, json: async () => [page] })
    await assert.rejects(fetchIntegrityPolicy(), /ACF-fält/)
  }
})
