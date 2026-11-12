import { useEffect, useState } from 'react';
import { fetchIntegrityPolicy } from '../api/policy.js';
import { renderPolicyContent } from './policyContent.js';
import '../css/IntegrityPolicyPage.css';

function IntegrityPolicyPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchIntegrityPolicy()
            .then(setData)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="policy-loading">Laddar...</div>;
    if (error) return <div className="policy-error">Fel: {error}</div>;
    if (!data) return null;

    return (
        <div className="integrity-policy-page">
            <header className="policy-hero">
                {data.policy_heading && <h1>{data.policy_heading}</h1>}
            </header>

            <div className="policy-content">
                {data.policy_intro && <p className="policy-intro">{data.policy_intro}</p>}

                {/* Dynamic sections */}
                {[1, 2, 3, 4].map((section) => {
                    const heading = `section_heading_${section}`;
                    const content = `section_${section}_content`;

                    if (data[heading] && data[content]) {
                        return (
                            <section key={section}>
                                <h2>{data[heading]}</h2>
                                <div className="policy-section-content">
                                    {renderPolicyContent(data[content])}
                                </div>
                            </section>
                        );
                    }
                    return null;
                })}

                {/* Contact email for questions */}
                {data.policy_contact_email && (
                    <p className="policy-contact">
                        Har du frågor? Maila: <a href={`mailto:${data.policy_contact_email}`}>{data.policy_contact_email}</a>
                    </p>
                )}
            </div>
        </div>
    );
}

export default IntegrityPolicyPage;