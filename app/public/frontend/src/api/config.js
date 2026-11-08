// Empty means same-origin; Vite proxies /wp-json during local development.
const wordpressUrl = (import.meta.env?.VITE_WORDPRESS_URL || '').replace(/\/+$/, '')

export const WP_API = `${wordpressUrl}/wp-json/wp/v2`
export const FENIX_API = `${wordpressUrl}/wp-json/fenix/v1`
export const JWT_API = `${wordpressUrl}/wp-json/jwt-auth/v1`
