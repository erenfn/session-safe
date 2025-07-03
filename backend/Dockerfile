FROM node:22-alpine3.21

# Install Docker CLI
RUN apk update && apk add bash docker-cli && rm -rf /var/cache/apk/*

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

# Build TypeScript code if in production environment
RUN if [ "$NODE_ENV" = "production" ]; then \
      npm run build ; \
    else \
      echo "Skipping build for non-production environment" ; \
    fi

# Build browser-session image if in production environment
RUN if [ "$NODE_ENV" = "production" ]; then \
        echo "Building browser-session image for production..." && \
        docker build -f browser-session.Dockerfile -t browser-session . ; \
    else \
        echo "Skipping browser-session build for non-production environment" ; \
    fi

EXPOSE 3000