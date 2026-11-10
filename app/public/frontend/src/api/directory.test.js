import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { fetchMemberDirectory, groupDirectoryRows, buildDirectoryCSV, downloadCSV, filterMembers } from './directory.js'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

test('member directory requires authentication and validates the response shape', async () => {
  let called = false
  globalThis.fetch = async (url, options) => {
    called = true
    assert.match(url, /\/fenix\/v1\/member-directory$/)
    assert.equal(options.headers.Authorization, '******')
    return { ok: true, json: async () => [{ type: 'member', name: 'Eve', company: 'Example AB' }] }
  }
  await assert.rejects(fetchMemberDirectory(''), /Not logged in/)
  assert.equal(called, false)
  assert.equal((await fetchMemberDirectory('******'))[0].name, 'Eve')
})

test('member directory surfaces server errors', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({ message: 'Forbidden' }) })
  await assert.rejects(fetchMemberDirectory('******'), /Forbidden/)
})

test('directory groups flat rows without merging members with identical names', () => {
  const rows = [
    { type: 'member', user_id: 1, name: 'Kim' },
    { type: 'guest', id: 'guest-1', name: 'Guest', invited_by: 'Kim' },
    { type: 'member', user_id: 2, name: 'Kim' }
  ]
  const groups = groupDirectoryRows(rows)
  assert.equal(groups.length, 2)
  assert.equal(groups[0].guests[0].id, 'guest-1')
  assert.deepEqual(groups[1].guests, [])
  assert.throws(() => groupDirectoryRows([{ type: 'guest' }]), /ogiltig radordning/)
})

test('filterMembers matches fields case-insensitively and keeps guests attached', () => {
  const members = [
    { name: 'Göran', company: 'A', guests: [{ name: 'Gäst' }] },
    { name: 'Eva', company: 'B', deputy: 'Sven', guests: [] }
  ]
  assert.equal(filterMembers(members, '  ').length, 2)
  const result = filterMembers(members, 'GÖRAN')
  assert.equal(result.length, 1)
  assert.equal(result[0].guests.length, 1)
  assert.equal(filterMembers(members, 'sven')[0].name, 'Eva')
  assert.equal(filterMembers(members, 'zzz').length, 0)
})

test('CSV preserves column order, unicode, quotes and multiline fields safely', () => {
  const csv = buildDirectoryCSV([
    { type: 'member', name: 'Åsa, "A"', company: 'ACME', expertise: 'A\nB', deputy: 'Bo', specific_search: '=1+1' },
    { type: 'guest', name: 'Gäst', company: 'Gäst AB', guest_name: 'Gäst', guest_email: 'g@example.com', invited_by: 'Åsa, "A"' }
  ])
  assert.equal(csv, '\uFEFF"Namn","Företag","Är bra på!","Ersättare","Specifika sök","Gästnamn","E-post","Inbjuden av"\r\n"Åsa, ""A""","ACME","A\nB","Bo","\'=1+1","","",""\r\n"","","","","","Gäst","g@example.com","Åsa, ""A"""')
})

test('download uses a UTF-8 CSV blob and releases its object URL', async () => {
  const originalURL = globalThis.URL
  const originalDocument = globalThis.document
  let blob
  let revoked = false
  let clicked = false
  let removed = false
  const link = { click: () => { clicked = true }, remove: () => { removed = true } }
  globalThis.URL = { createObjectURL: value => { blob = value; return 'blob:test' }, revokeObjectURL: () => { revoked = true } }
  globalThis.document = { createElement: () => link, body: { appendChild: () => {} } }
  try {
    downloadCSV([{ type: 'member', name: 'Åsa' }])
    assert.equal(blob.type, 'text/csv;charset=utf-8')
    assert.match(await blob.text(), /Åsa/)
    assert.match(link.download, /^medlemskatalog_\d{4}-\d{2}-\d{2}\.csv$/)
    assert.ok(clicked && removed)
    await new Promise(resolve => setTimeout(resolve, 1100))
    assert.ok(revoked)
  } finally {
    globalThis.URL = originalURL
    globalThis.document = originalDocument
  }
})
