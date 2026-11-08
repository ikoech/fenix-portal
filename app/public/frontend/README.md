# React + Vite

The development server proxies `/wp-json` to `http://fenix-portal.local` by
default. Set `WORDPRESS_PROXY_TARGET` in `frontend/.env.local` to use another
local WordPress URL, then restart Vite. For a frontend hosted separately from
WordPress, set `VITE_WORDPRESS_URL` to the WordPress origin at build time and
configure the WordPress server to allow that origin and the Authorization
header. An unset `VITE_WORDPRESS_URL` uses same-origin requests (and the Vite
proxy during development).

Event signups and guest rosters require a signed-in member. In Events, sign up
before adding or removing guests. On the start page, use “Skriv ut / spara som
PDF” to print the selected event roster or save it as a PDF in the print dialog.
Cancelled signups remain in the printout; signing up again creates a fresh
signup without automatically restoring its previous guests.

Run frontend tests with `node --test src/utils/eventRoster.test.js src/api/events.test.js`.
The isolated PHP signup tests can be run from the repository root with
`php tests/event-signups.php`; they do not modify the WordPress database.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
