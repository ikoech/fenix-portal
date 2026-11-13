import { WP_API } from './config.js';

export async function fetchBylaws() {
    const response = await fetch(`${WP_API}/stadgar?per_page=1`);

    if (!response.ok) {
        throw new Error(`Failed to fetch bylaws: ${response.status}`);
    }

    const bylaws = await response.json();
    if (!Array.isArray(bylaws)) {
        throw new Error('Ogiltigt svar från WordPress för stadgarna.');
    }
    if (bylaws.length === 0) {
        throw new Error('Inget inlägg för stadgarna är publicerat i WordPress.');
    }
    if (!bylaws[0].acf || typeof bylaws[0].acf !== 'object' || typeof bylaws[0].acf.bylaws_link !== 'string' || !bylaws[0].acf.bylaws_link.trim()) {
        throw new Error('Stadgarnas ACF-fält saknas eller är inte ifyllda i WordPress.');
    }
    const link = bylaws[0].acf.bylaws_link.trim();
    let url;
    try {
        url = new URL(link);
    } catch {
        throw new Error('Stadgarnas PDF-länk är ogiltig i WordPress.');
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Stadgarnas PDF-länk måste använda HTTP eller HTTPS.');
    }
    return { ...bylaws[0].acf, bylaws_link: url.href };
}

export function getBylawsDownloadUrl(link) {
    const url = new URL(link);
    if (url.hostname === 'drive.google.com') {
        const match = url.pathname.match(/^\/file\/d\/([\w-]+)(?:\/|$)/);
        const id = match ? match[1] : url.searchParams.get('id');
        if (id && /^[\w-]+$/.test(id)) {
            const downloadUrl = new URL('https://drive.google.com/uc');
            downloadUrl.searchParams.set('export', 'download');
            downloadUrl.searchParams.set('id', id);
            const resourceKey = url.searchParams.get('resourcekey');
            if (resourceKey) downloadUrl.searchParams.set('resourcekey', resourceKey);
            return downloadUrl.href;
        }
    }
    return url.href;
}