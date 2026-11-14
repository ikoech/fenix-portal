# React + Vite

The development server proxies `/wp-json` to `http://fenix-portal.local` by
default. Set `WORDPRESS_PROXY_TARGET` in `frontend/.env.local` to use another
local WordPress URL, then restart Vite. For a frontend hosted separately from
WordPress, set `VITE_WORDPRESS_URL` to the WordPress origin at build time and
configure the WordPress server to allow that origin and the Authorization
header. An unset `VITE_WORDPRESS_URL` uses same-origin requests (and the Vite
proxy during development).

The integrity policy tab reads ACF fields from the latest published
`integritetspolicy` custom post. Registering the post type and ACF fields does
not create an entry: create and publish a post of that type, fill in its policy
heading and content, and enable “Show in REST API” for its ACF field group.
The current policy stores sections 4–7 in the fourth section's content field.

The Stadgar footer link opens the public bylaws tab. It reads `bylaws_link`
from the latest published `stadgar` custom post. Enable “Show in REST API” for
its ACF field group and publish an entry with a publicly accessible PDF URL.
Google Drive file links use Drive's download endpoint; for other external PDFs,
downloads depend on the hosting server and browser.

Event signups and guest rosters require a signed-in member. In Events, sign up
before adding or removing guests. On the start page, use “Skriv ut / spara som
PDF” to print the selected event roster or save it as a PDF in the print dialog.
New guests require a name and email address. Guest emails are visible to signed-in
members in the roster and printout; older guests may have no email. The portal
stores these addresses but does not send invitation emails.
Cancelled signups remain in the printout; signing up again creates a fresh
signup without automatically restoring its previous guests.

## Membership applications

The public `/bli-medlem` page submits applications to the private
`fenix_application` post type through the `fenix/v1/applications` API. Deploy
`fenix-applications.php` as a must-use plugin alongside the frontend. The web
server must serve the React app for `/bli-medlem` as well as `/portal`. CPT UI
must register `fenix_application`, and its ACF group must contain the fields
`fornamn`, `efternamn`, `e-postadress`, `telefonnummer`, `foretagsnamn`,
`organisationsnummer`, `roll`, `bransch`, `referenser` and `samtycke_godkant`.
The form requires all of them. The plugin hides the CPT's normal WordPress UI,
REST endpoint, archive and public queries; administrators review applications
in the portal's Admin > Ansökningar section instead.

Submission creates a private draft, not a WordPress user. Approval creates a
subscriber and sends a WordPress password-setup link; rejection sends a
decision message. A failed email can be retried from the application. An
existing account with the same email requires manual review and is never
automatically linked. If an account is created but linking it to an application
fails, resolve that explicitly rather than creating a second account. A mail
status of “Avsänd” means WordPress accepted the message, not that it was
delivered. Configure and test mail delivery and the WordPress site URL before
deployment. Decide on a retention/deletion policy for application data.

The form links to the portal's bylaws and privacy policy and to the existing
public membership documents. Verify the documents, costs and access before
accepting applications. The acceptance timestamp and form version are stored
with each application; update the version in the plugin when the agreement
changes. Pending applicants should contact the network to arrange meeting
attendance; portal event signup still requires a user account. Submission is
limited to five valid attempts per IP per hour. If a reverse proxy is used,
configure it to pass the real client address as `REMOTE_ADDR` securely.

Run frontend tests with `node --test src/utils/eventRoster.test.js src/api/events.test.js src/api/directory.test.js src/api/admin.test.js src/api/members.test.js src/api/applications.test.js`.
The isolated PHP signup tests can be run from the repository root with
`php tests/event-signups.php`; they do not modify the WordPress database.
Run `php tests/member-profiles.php` for isolated profile-update tests.
Run `php tests/applications.php` for the isolated application workflow tests.

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
