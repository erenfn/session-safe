# SessionSafe

SessionSafe enables a user to sign in to a real third‑party web account inside an isolated, temporary remote desktop session. Once the user completes the login flow the service will:

*   Capture the resulting authentication cookies for the target domain
*   Encrypt and store the cookies securely
*   Expose a simple API to retrieve the cookies
*   Automatically destroy all temporary compute infrastructure created for the session.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=
JWT_SECRET=
COOKIE_ENCRYPTION_KEY=
```

## Getting Started

Run `build-browser-image.bat` or `build-browser-image.sh` to build the browser image in docker.

### Development Mode

For local development:

```bash
# Using npm script
npm run docker-up:dev

# Or directly with docker compose
docker compose -f docker-compose.dev.yml up
``

### Production Mode 

Run the application using Docker Compose:

```bash
# Using npm script
npm run docker-up:prod

# Or directly with docker compose
docker compose -f docker-compose.prod.yml up
```

