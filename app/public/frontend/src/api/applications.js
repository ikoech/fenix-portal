import { FENIX_API } from './config.js'

async function applicationRequest(path, options = {}, authHeader) {
  const headers = { ...options.headers }
  if (authHeader) headers.Authorization = authHeader
  const response = await fetch(`${FENIX_API}/applications${path}`, { ...options, headers })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.message || `Begäran misslyckades (${response.status}).`)
  return data
}

export async function submitApplication(fields) {
  const data = await applicationRequest('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields)
  })
  if (!data || typeof data.message !== 'string' || !data.message) {
    throw new Error('Ansökan kunde inte bekräftas. Kontakta oss innan du försöker igen.')
  }
  return data
}

export async function listApplications(authHeader, signal) {
  if (!authHeader) throw new Error('Din session har gått ut. Logga in igen.')
  const data = await applicationRequest('', { cache: 'no-store', signal }, authHeader)
  if (!Array.isArray(data) || data.some(item => !item || typeof item.id !== 'number' || !item.fields || typeof item.fields !== 'object')) {
    throw new Error('Svaret innehöll inte en giltig ansökningslista.')
  }
  return data
}

export async function reviewApplication(authHeader, id, action) {
  if (!authHeader) throw new Error('Din session har gått ut. Logga in igen.')
  const data = await applicationRequest(`/${encodeURIComponent(id)}/${action}`, { method: 'POST' }, authHeader)
  if (!data || typeof data.id !== 'number' || !data.fields || typeof data.fields !== 'object') {
    throw new Error('Svaret innehöll inte en giltig ansökan. Uppdatera listan.')
  }
  return data
}
