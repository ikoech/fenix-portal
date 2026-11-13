import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { fetchBylaws, getBylawsDownloadUrl } from './bylaws.js'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

test('fetches the published bylaws link', async () => {
  globalThis.fetch = async url => {
    assert.equal(url, '/wp-json/wp/v2/stadgar?per_page=1')
    return { ok: true, json: async () => [{ acf: { bylaws_link: 'https://example.com/stadgar.pdf' } }] }
  }
  assert.equal((await fetchBylaws()).bylaws_link, 'https://example.com/stadgar.pdf')
})

test('reports unpublished and invalid bylaws', async () => {
  for (const [result, message] of [
    [[], /Inget inlägg.*publicerat/],
    [[{ acf: {} }], /ACF-fält/],
    [[{ acf: { bylaws_link: 'javascript:alert(1)' } }], /HTTP eller HTTPS/],
    [[{ acf: { bylaws_link: 'not a url' } }], /ogiltig/],
  ]) {
    globalThis.fetch = async () => ({ ok: true, json: async () => result })
    await assert.rejects(fetchBylaws(), message)
  }
})

test('creates a Drive download link and preserves resource keys', () => {
  assert.equal(
    getBylawsDownloadUrl('https://drive.google.com/file/d/abc-123/view?resourcekey=key-123'),
    'https://drive.google.com/uc?export=download&id=abc-123&resourcekey=key-123',
  )
  assert.equal(
    getBylawsDownloadUrl('https://drive.google.com/open?id=abc-123'),
    'https://drive.google.com/uc?export=download&id=abc-123',
  )
  assert.equal(getBylawsDownloadUrl('https://example.com/stadgar.pdf'), 'https://example.com/stadgar.pdf')
})
