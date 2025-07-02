# Environment Variables

This document describes the required environment variables for the Session Safe application.

## Required Environment Variables

### Database Configuration
- `POSTGRES_USER`: PostgreSQL username
- `POSTGRES_PASSWORD`: PostgreSQL password  
- `POSTGRES_DB`: PostgreSQL database name
- `POSTGRES_HOST`: PostgreSQL host (default: postgres)
- `POSTGRES_PORT`: PostgreSQL port (default: 5432)

### Application Configuration
- `NODE_ENV`: Node.js environment (development/production)
- `JWT_SECRET`: Secret key for JWT token signing
- `BACKEND_HOST`: Hostname or IP address of the backend server (default: localhost)

### Security Variables
- `COOKIE_ENCRYPTION_KEY`: 32-byte encryption key for cookie encryption
- `PYTHON_SCRIPT_SECRET`: Secret key for secure communication between containers

## Setup Instructions

1. Create a `.env` file in the root directory with the following template:

```env
# Database Configuration
POSTGRES_USER=your_postgres_user
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DB=your_database_name
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Application Configuration
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here
BACKEND_HOST=localhost

# Cookie Encryption and Python Script Security
COOKIE_ENCRYPTION_KEY=your_32_byte_encryption_key_here
PYTHON_SCRIPT_SECRET=your_python_script_secret_key_here
```

2. Replace the placeholder values with your actual configuration.

3. **Important Security Notes:**
   - `COOKIE_ENCRYPTION_KEY` must be exactly 32 bytes long
   - `PYTHON_SCRIPT_SECRET` is used for secure communication between containers
   - These values should be kept secret and not committed to version control
   - Use strong, randomly generated values for production environments

## Docker Usage

The environment variables are automatically passed to the browser session containers at runtime. No additional configuration is needed when using docker-compose.

For manual Docker runs, you can pass environment variables using:

```bash
# Using environment file
docker run --env-file .env browser-session

# Using individual environment variables
docker run -e COOKIE_ENCRYPTION_KEY=your_key -e PYTHON_SCRIPT_SECRET=your_secret browser-session
``` 