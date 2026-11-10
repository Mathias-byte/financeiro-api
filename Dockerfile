FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache bash curl openssl libc6-compat && \
    curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.alpine.sh' | bash && \
    apk add infisical

COPY --from=build /app /app

EXPOSE 9517
CMD ["sh", "-c", "export INFISICAL_TOKEN=$(infisical login --domain https://app.infisical.com --method universal-auth --client-id $INFISICAL_UNIVERSAL_AUTH_CLIENT_ID --client-secret $INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET --silent --plain) && infisical run --domain https://app.infisical.com --projectId $INFISICAL_PROJECT_ID --env prod --path /api-gateway -- node src/server.js"]