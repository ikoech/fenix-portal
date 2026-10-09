import { useState, useEffect } from 'react';
import { fetchDocuments, createDocument } from '../api/documents';
import { formatACFDate } from '../utils/date'
import '../css/DocumentsTab.css';

function DocumentTab({ authHeader }) {
  const [documents, setDocuments] = useState([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  }

  async function handleUploadSubmit(e) {
    e.preventDefault();
    setUploadMessage('');
    if (!uploadName || !uploadFile) {
      setUploadMessage('Please enter a file name and select a file.');
      return;
    }

    // Build ACF date in yyyymmdd format (matches Events tab)
    const now = new Date();
    const acfUploadDate =
      String(now.getFullYear()) +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');

    const userData = JSON.parse(sessionStorage.getItem('fenix_user') || '{}');

    // Use the real file name from the file input (includes extension)
    const realFileName = uploadFile?.name || uploadName;

    try {
      await createDocument(
        sessionStorage.getItem('fenix_auth'),
        realFileName,
        '#',
        acfUploadDate,
        userData.id
      );
      setUploadMessage('Document uploaded successfully!');
      setUploadName('');
      setUploadFile(null);
      setShowUploadForm(false);
      loadDocuments();
    } catch (err) {
      setUploadMessage('Upload failed: ' + err.message);
    }
  }

  return (
    <div className="documents-tab">
      <div className="tab-header">
        <h2>Document Library</h2>
        <button onClick={() => setShowUploadForm(!showUploadForm)}>
          {showUploadForm ? 'Cancel' : '+ Upload Document'}
        </button>
      </div>

      {showUploadForm && (
        <form onSubmit={handleUploadSubmit} className="upload-form">
          <h3>Upload a Document</h3>
          <div className="form-group">
            <label>File Name *</label>
            <input
              type="text"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="e.g., Q3 Meeting Notes"
            />
          </div>
          <div className="form-group">
            <label>Select File *</label>
            <input
              type="file"
              onChange={(e) => setUploadFile(e.target.files[0])}
            />
          </div>
          <button type="submit">Upload</button>
          {uploadMessage && <p className="message">{uploadMessage}</p>}
        </form>
      )}

      <div className="document-list">
        {documents.length === 0 ? (
          <p>No documents uploaded yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>File Name</th>
                <th>Uploaded By</th>
                <th>Upload Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.title?.rendered || doc.acf?.file_name || 'Untitled'}</td>
                  <td>{doc.acf?.uploaded_by || '—'}</td>
                  <td>{formatACFDate(doc.acf?.upload_date)}</td>
                  <td>
                    <a href={doc.acf?.file_url || '#'} download>
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default DocumentTab;