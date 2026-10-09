const API_BASE = 'http://fenix-portal.local/wp-json/wp/v2'

export async function fetchDocuments() {
  const res = await fetch(`${API_BASE}/documents`)
  if (!res.ok) throw new Error(`Failed to fetch documents (${res.status})`)
  return res.json()
}

export async function createDocument(authHeader, fileName, fileUrl, uploadDate, userId) {
  const res = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      title: fileName,
      status: 'publish',
      acf: {
        file_url: fileUrl,
        file_name: fileName,
        uploaded_by: userId || 1,
        upload_date: uploadDate
      }
    })
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Document creation failed: ${errorText}`)
  }
  return res.json()
}