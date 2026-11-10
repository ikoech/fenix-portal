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
New guests require a name and email address. Guest emails are visible to signed-in
members in the roster and printout; older guests may have no email. The portal
stores these addresses but does not send invitation emails.
Cancelled signups remain in the printout; signing up again creates a fresh
signup without automatically restoring its previous guests.

Run frontend tests with `node --test src/utils/eventRoster.test.js src/api/events.test.js src/api/directory.test.js src/api/admin.test.js src/api/members.test.js`.
The isolated PHP signup tests can be run from the repository root with
`php tests/event-signups.php`; they do not modify the WordPress database.
Run `php tests/member-profiles.php` for isolated profile-update tests.

## Deploying guest approval and member exports

Deploy the updated `fenix-event-signups.php` and `fenix-member-profiles.php`
must-use plugins together with the rebuilt frontend. Existing guest records
without a status are treated as active, so no guest-data migration is needed.
New guests remain pending and do not consume capacity until an administrator
approves them. The member export reads `company`, `expertise`, and
`specific_search` from user meta; members can add or update those fields in
their profile. Company remains optional as in the existing form. Expertise and
specific search allow up to 1,000 UTF-16 code units each and preserve line
breaks. Existing user meta needs no migration; empty values remain blank.
The existing weekly counter rebuild remains in place.

To check profile persistence, edit company, expertise, and specific search,
including multiple lines, then save. Log out and back in and verify the fields
are pre-filled. Clear the optional fields and check that the member directory
shows a dash for each empty value.

The authenticated Medlemskatalog groups guests beneath each member and offers
printing and CSV download. It includes pending, approved, and rejected guests
from current and cancelled signups; the on-screen and printed list shows their
status. The requested seven-column CSV does not include status and must not be
used as an attendance list. Deleted accounts and their guests are omitted.
Accounts follow the existing WordPress user directory: WordPress users do not
have a published/draft status. CSV includes a UTF-8 BOM for spreadsheet
compatibility and prefixes formula-like cells with an apostrophe for safety.

To check the approval flow, sign in as a member and add a guest to an event.
The guest appears as “Väntar på godkännande”. Sign in as an administrator,
open Admin, and approve or reject the guest under “Gäster som väntar på
godkännande”. The guest disappears from that list. An approved guest counts
toward event capacity; a rejected guest remains in the event roster as
“Avvisad” and does not count toward capacity. Try both actions with separate
guests, and test that approving a guest for a full event reports the error.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
