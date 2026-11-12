import { WP_API } from './config.js';

export async function fetchIntegrityPolicy() {
    const response = await fetch(`${WP_API}/integritetspolicy?per_page=1`);

    if (!response.ok) {
        throw new Error(`Failed to fetch privacy policy: ${response.status}`);
    }

    const policies = await response.json();
    if (!Array.isArray(policies)) {
        throw new Error('Ogiltigt svar från WordPress för integritetspolicyn.');
    }
    if (policies.length === 0) {
        throw new Error('Inget inlägg för integritetspolicyn är publicerat i WordPress.');
    }
    if (!policies[0].acf || typeof policies[0].acf !== 'object' || !policies[0].acf.policy_heading) {
        throw new Error('Integritetspolicyns ACF-fält saknas eller är inte ifyllda i WordPress.');
    }
    return policies[0].acf;
}