FROM node:24-alpine AS builder

LABEL org.opencontainers.image.source=https://github.com/Outburn-IL/fume-community
LABEL org.opencontainers.image.description="FUME FHIR Conversion & Mapping Engine"
LABEL org.opencontainers.image.licenses=AGPL-3.0
LABEL org.opencontainers.image.authors="Outburn Ltd."

# Install build dependencies for any native dependencies during npm ci.
RUN apk add --no-cache build-base python3

WORKDIR /usr/src/app

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts \
    && npm rebuild

# Copy the rest of the source and build
COPY . .
RUN npm run build \
    && npm prune --omit=dev \
    && npm cache clean --force

FROM node:24-alpine AS runtime

WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules

EXPOSE 42420
CMD ["node", "dist/app.cjs"]
