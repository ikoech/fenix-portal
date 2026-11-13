import { useEffect, useState } from 'react';
import { fetchBylaws, getBylawsDownloadUrl } from '../api/bylaws.js';
import '../css/BylawsPage.css';

function BylawsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchBylaws()
            .then(setData)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="bylaws-loading">Laddar...</div>;
    if (error) return <div className="bylaws-error">Fel: {error}</div>;
    if (!data) return null;

    return (
        <div className="bylaws-page">
            <div className="bylaws-content">
                <h1>Stadgar</h1>
                <p className="bylaws-link-container">
                    <a href={data.bylaws_link} target="_blank" rel="noopener noreferrer" className="bylaws-link">
                        Läs stadgarna (PDF)
                    </a>
                </p>
                <p className="bylaws-link-container">
                    <a href={getBylawsDownloadUrl(data.bylaws_link)} download className="bylaws-link">
                        Ladda ner stadgarna
                    </a>
                </p>
                <p>Om PDF-filen öppnas i webbläsaren kan du spara den från PDF-visaren.</p>
            </div>
        </div>
    );
}

export default BylawsPage;