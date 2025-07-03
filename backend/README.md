# SessionSafe Backend

SessionSafe is a secure platform that allows you to securely connect to your accounts and retrieve cookies. This repository holds the backend of SessionSafe.

### Setup

1. Update the environment variables in `.env.dev`, `.env.test`, or `.env.prod` as needed

### Environment Variables

The following environment variables are required for the database connection:

```
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=sessionsafe_db
```

### Docker

To run the application with Docker:

```bash
npm run dockerUp
```

This will start the application with PostgreSQL and Redis.

## Browser Session Container

A Dockerfile (`browser-session.Dockerfile`) is provided to launch a Linux desktop with Chromium browser, VNC server, and noVNC for browser-based access.

### Build the image

```sh
docker build -f browser-session.Dockerfile -t browser-session .
```

### Run the container

```sh
docker run -p 5901:5901 -p 6080:6080 browser-session
```

- VNC server: `vnc://localhost:5901` (default password: `1234`)
- noVNC (browser): [http://localhost:6080/vnc.html](http://localhost:6080/vnc.html)

The container launches XFCE desktop and Chromium browser. Use the noVNC web client for easy access from your browser.
