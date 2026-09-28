# Fenix Member Portal

A web application serving as the member portal for the Affärsnätverket Fenix
business network. Built as a headless architecture.

## Architecture

WordPress functions as the data layer and REST API backend. A custom React
frontend consumes the API. This separation means the portal UI and all
business logic are written from scratch — no member-portal plugins are used.

### Data model (Custom Post Types + ACF)

| Feature        | Endpoint                    | Fields |
|----------------|-----------------------------|--------|
| Member profiles| /wp-json/wp/v2/users        | company, phone, bio, interests, avatar_url |
| Events         | /wp-json/wp/v2/event        | event_date, location, max_attendees |
| Seeking posts  | /wp-json/wp/v2/seeking      | description, category, active |
| TFA deals      | /wp-json/wp/v2/tfa          | from_member, to_member, deal_amount |

## Technology choices

- **LocalWP** — local development environment (nginx, PHP, MySQL)
- **WordPress + ACF + CPT UI** — content modelling and REST API generation
- **React (Vite)** — frontend SPA *(in progress)*

## Installation

1. Install [LocalWP](https://localwp.com)
2. Create a site using the provided database export
3. Import SQL via Adminer (available in Local)
4. Activate plugins: Advanced Custom Fields, Custom Post Type UI
5. Run `npm install && npm run dev` in the `frontend/` directory

## Documentation

See [AI_LOG.md](AI_LOG.md) for a record of AI-assisted development.