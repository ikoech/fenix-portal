const STATUS = {
  active: { label: 'Anmäld', className: 'status-active' },
  cancelled: { label: 'Avanmäld', className: 'status-cancelled' },
  pending: { label: 'Väntar på godkännande', className: 'status-pending' },
  rejected: { label: 'Avvisad', className: 'status-rejected' }
}

// A guest has exactly one current status; a cancelled signup overrides the guest's own status.
export function getGuestStatus(guest) {
  const key = guest?.signup_cancelled || guest?.cancelled_at ? 'cancelled' : guest?.status
  return STATUS[key] || STATUS.active
}
