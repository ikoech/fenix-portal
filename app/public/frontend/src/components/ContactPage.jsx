import { useEffect, useState } from 'react';
import { fetchContactPage } from '../api/contact.js';
import '../css/ContactPage.css';

function ContactPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchContactPage()
            .then(setData)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="contact-loading">Laddar...</div>;
    if (error) return <div className="contact-error">Fel: {error}</div>;
    if (!data) return null;

    return (
        <div className="contact-page">
            <main className="contact-content">
                <h1>Kontakt</h1>

                {data.contact_intro && <p>{data.contact_intro}</p>}

                {data.contact_email && (
                    <a href={`mailto:${data.contact_email}`} className="contact-email">
                        {data.contact_email}
                    </a>
                )}

                <h2>{data.venue_heading || 'Här träffas vi'}</h2>

                {data.venue_name && (
                    <p className="contact-venue">
                        {data.venue_link ? (
                            <a href={data.venue_link} target="_blank" rel="noopener noreferrer">
                                {data.venue_name}
                            </a>
                        ) : (
                            data.venue_name
                        )}
                    </p>
                )}

                {data.meeting_time && <p className="contact-time">{data.meeting_time}</p>}

                {/* Map — rendered from ACF textarea */}
                {data.map_embed && (
                    <div
                        className="contact-map"
                        dangerouslySetInnerHTML={{ __html: data.map_embed }}
                    />
                )}
            </main>
        </div>
    );
}

export default ContactPage;