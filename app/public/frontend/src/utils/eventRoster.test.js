import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectNextEvent, parseEventDate, buildRosterPrintHtml } from './eventRoster.js'

const event = (id, date) => ({ id, acf: { event_date: date } })

test('selects today before future events, regardless of input order', () => {
  const events = [event(3, '20261110'), event(1, '20261107'), event(2, '2026-11-08')]
  assert.equal(selectNextEvent(events, new Date(2026, 10, 8, 15)).id, 2)
})

test('selects earliest future event and never falls back to past or invalid dates', () => {
  const events = [event(3, '20261112'), event(1, '20261107'), event(2, '20261109')]
  assert.equal(selectNextEvent(events, new Date(2026, 10, 8)).id, 2)
  assert.equal(selectNextEvent([event(1, '20261107'), event(4, '20260230')], new Date(2026, 10, 8)), null)
  assert.equal(parseEventDate('2026-99-99'), null)
})

test('print roster includes status, attribution and cancellation details with escaped values', () => {
  const html = buildRosterPrintHtml('Event <title>', '8 nov', [
    { name: 'Member & Co', type: 'member', email: 'member@example.com', company: 'Member Company' },
    { name: '<script>guest</script>', type: 'guest', email: 'guest&<tag>@example.com', company: 'Guest Company', status: 'rejected', inviter_name: 'Member "A"' }
  ], [{ name: 'Past guest', type: 'guest', email: 'past@example.com', inviter_name: 'Member', cancelled_at: '2026-11-08', cancelled_by: 'Admin' }])
  assert.match(html, /Event &lt;title&gt;/)
  assert.match(html, /Member &amp; Co/)
  assert.match(html, /&lt;script&gt;guest&lt;\/script&gt;/)
  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /Member &quot;A&quot;/)
  assert.match(html, /guest&amp;&lt;tag&gt;@example\.com/)
  assert.match(html, /past@example\.com/)
  assert.match(html, /member@example\.com/)
  assert.match(html, /Member Company/)
  assert.match(html, /Guest Company/)
  assert.match(html, /Avvisad/)
  assert.match(html, /Gäst/)
  assert.match(html, /Avanmäld/)
  assert.match(html, /2026-11-08/)
  assert.match(html, /Admin/)
})
