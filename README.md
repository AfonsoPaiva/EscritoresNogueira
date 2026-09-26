<div align="center">

# Escritores Nogueira

**Website and store for [escritoresnogueira.com](https://escritoresnogueira.com)** — a Portuguese self-publishing service that helps people turn their ideas into a printed book, with an online store for finished titles and a literary blog.

[![Java](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![CockroachDB](https://img.shields.io/badge/Database-CockroachDB-6933FF?logo=cockroachlabs&logoColor=white)](https://www.cockroachlabs.com)
[![Docker](https://img.shields.io/badge/Container-Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![GCP](https://img.shields.io/badge/Deployed%20on-Google%20Cloud%20Run-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/run)

</div>

---

## About

This repository is a monorepo for **Escritores Nogueira**: it holds both the public-facing website (books catalogue, blog, book-publishing enquiry form, and checkout) and the Spring Boot API that powers it — user accounts, orders, payments, blog/book content, comments, newsletters, and an internal admin panel.

- **`frontend/`** — a static, vanilla HTML/CSS/JS site (no build step) served as-is
- **`backend/`** — a Java 21 / Spring Boot 3 REST API

## Features

**Storefront**
- Public book catalogue with featured titles and per-book detail pages
- Moderated reader comments/ratings on books, with a "helpful" vote
- Literary blog with categories and featured posts
- "Publish your book" enquiry form for prospective authors

**Accounts & Orders**
- Firebase-authenticated user accounts, with server-issued session tokens for the storefront
- User profile management, order history, and account statistics
- Newsletter subscribe/unsubscribe, with a client-facing API key

**Payments**
- Stripe Checkout sessions for card payments
- MB WAY and bank-transfer order flows for the Portuguese market
- Stripe account/config lookup for the frontend checkout page

**Admin Panel**
- Static admin UI (`/admin-ui`) backed by dedicated admin APIs
- Manage books, blog posts/categories, comments, orders, users, newsletters, and form submissions
- Dashboard summary and recent-activity endpoints
- Authentication via JWT session **or** Google Identity-Aware Proxy (IAP) headers, layered behind role-based access control

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Java 21 |
| Framework | Spring Boot 3.5 (Web, Security, Data JPA, Validation, Actuator, Mail) |
| Database | CockroachDB (via PostgreSQL driver + Hibernate's CockroachDialect) |
| Auth | Firebase Admin SDK (user auth) + JWT / Google IAP (admin auth) |
| Payments | Stripe Java SDK, plus MB WAY and bank-transfer flows |
| Email | Mailgun / SMTP |
| Bot protection | Google reCAPTCHA |
| Rate limiting | Bucket4j (with Redis backing) |
| Mapping / boilerplate | MapStruct, Lombok |
| Frontend | Static HTML5, CSS, vanilla JavaScript |
| Containerization | Docker, multi-stage Maven build |
| CI/CD & hosting | Google Cloud Build → Google Cloud Run |

## Security

- Firebase-authenticated endpoints for regular users; session tokens (validated per-request) for the storefront and account pages
- Admin API protected by role-based access control (`ROLE_ADMIN`), reachable via either a JWT filter or a Google IAP header filter — configurable per deployment
- Global rate limiting via a servlet filter backed by Bucket4j/Redis
- A strict Content-Security-Policy and locked-down CORS configuration (explicit origin allowlist for production and local dev ports)
- reCAPTCHA verification on public form submissions
- OWASP Dependency-Check wired into the Maven build to flag vulnerable dependencies

## Project Structure

```
.
├── frontend/                      # Static site (no build step)
│   ├── index.html, livros.html, livro.html, blog.html, artigo.html, ...
│   ├── css/                       # Site styles
│   ├── js/                        # Page logic, API client, auth, cart, payments
│   ├── data/                      # Static JSON fallbacks (blog.json, books.json)
│   └── assets/                    # Images, icons, favicons
├── backend/
│   ├── src/main/java/.../backend/
│   │   ├── controller/            # REST controllers (public, user, admin)
│   │   ├── service/                # Business logic (auth, email, newsletter, comments...)
│   │   ├── model/                  # JPA entities (User, Book, Order, BlogPost, ...)
│   │   ├── repository/             # Spring Data JPA repositories
│   │   ├── dto/                    # Request/response DTOs
│   │   ├── config/                 # Security, CORS, Firebase, Stripe, rate limiting
│   │   └── exception/               # Global exception handling
│   ├── src/main/resources/         # application.yml / .properties, static admin UI
│   └── Dockerfile
├── scripts/                        # Frontend runtime-config generator
├── run.bat                         # Loads .env and runs the backend locally
└── cloudbuild.yaml                 # Google Cloud Build pipeline
```

## API Overview

| Group | Base path | Auth | Examples |
|---|---|---|---|
| Auth | `/auth` | mixed | `POST /auth/firebase`, `POST /auth/register`, `GET /auth/firebase-config` |
| Session | `/session` | session token | `GET /session/me`, `POST /session/logout` |
| User | `/user` | session token | `GET /user/profile`, `GET /user/orders` |
| Books | `/books` | public | `GET /books`, `GET /books/featured`, `GET /books/{identifier}` |
| Book comments | `/books/{id}/comments` | mixed | `POST`, `GET`, `PUT .../helpful` |
| Blog | `/blog` | public | `GET /blog/posts`, `GET /blog/categories` |
| Payments | `/payments` | mixed | `POST /payments/create-checkout-session`, `POST /payments/mbway` |
| Public forms | `/public/form-submissions` | public | `POST /public/form-submissions` |
| Health | `/health` | public | `GET /health/status` |
| Admin | `/admin/**` | `ROLE_ADMIN` | books, blog, comments, orders, users, newsletters, form submissions, dashboard |
| Admin UI | `/admin-ui` | public (UI shell only) | static admin panel |

## Getting Started

### Prerequisites

- Java 21 + Maven (the included `mvnw` wrapper works too)
- A CockroachDB (or PostgreSQL-compatible) instance
- A Firebase project (Authentication)
- Stripe account (for payments)
- Mailgun account or SMTP credentials (for email)
- reCAPTCHA keys (optional, for form protection)
- Redis (optional — only needed if rate limiting is backed by `bucket4j-redis`)

### Configuration

Create a `.env` file (loaded by `run.bat` on Windows) or export these as environment variables:

```env
# Server
PORT=8080
SPRING_PROFILES_ACTIVE=prod

# Database (CockroachDB)
COCKROACH_DB_URL=jdbc:postgresql://host:26257/escritores_nogueira?sslmode=verify-full
COCKROACH_DB_USERNAME=
COCKROACH_DB_PASSWORD=

# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_WEB_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_APP_ID=
GOOGLE_APPLICATION_CREDENTIALS=./path/to/firebase-service-account.json

# Stripe
STRIPE_API_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CURRENCY=EUR

# Email (Mailgun or SMTP)
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
APP_EMAIL_FROM=no-reply@escritoresnogueira.com
APP_NEWSLETTER_FROM=newsletter@escritoresnogueira.com

# reCAPTCHA
RECAPTCHA_SECRET_KEY=
RECAPTCHA_SITE_KEY=

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5500
```

### Run the backend locally

```bash
cd backend
./mvnw spring-boot:run
```

Or, on Windows, from the repo root: `run.bat` (loads `.env`, then runs `mvn spring-boot:run`).

The API starts on `http://localhost:8080`, with a health check at `/health/status`.

### Run the frontend locally

The frontend is a static site with no build step — serve `frontend/` with any static file server (e.g. VS Code Live Server on port 5500) and point it at the backend via `frontend/js/runtime-config.js` / `frontend/js/api.js`.

### Run with Docker

```bash
docker build -t escritoresnogueira-backend -f backend/Dockerfile backend
docker run -p 8080:8080 --env-file .env escritoresnogueira-backend
```

### Deployment

`cloudbuild.yaml` builds the backend's Docker image and pushes it to Google Artifact Registry for deployment on Google Cloud Run.

## Author

Built and maintained by **[Afonso Paiva](https://github.com/AfonsoPaiva)**.
