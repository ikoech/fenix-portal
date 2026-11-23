import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as adminApi from './admin.js'

test('admin API does not expose event guest approval actions', () => {
  assert.equal('getPendingGuests' in adminApi, false)
  assert.equal('approveGuest' in adminApi, false)
  assert.equal('rejectGuest' in adminApi, false)
})
