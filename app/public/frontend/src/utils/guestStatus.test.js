import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getGuestStatus } from './guestStatus.js'

test('guest status maps to one clear label', () => {
  assert.equal(getGuestStatus({ status: 'active' }).label, 'Anmäld')
  assert.equal(getGuestStatus({ status: 'cancelled' }).label, 'Avanmäld')
  assert.equal(getGuestStatus({ status: 'pending' }).label, 'Väntar på godkännande')
  assert.equal(getGuestStatus({ status: 'rejected' }).label, 'Avvisad')
  assert.equal(getGuestStatus({ status: 'active', signup_cancelled: true }).label, 'Avanmäld')
  assert.equal(getGuestStatus({ status: 'active', signup_cancelled: true }).label.includes('-'), false)
})
