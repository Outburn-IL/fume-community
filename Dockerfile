FROM node:22 as builder

LABEL org.opencontainers.image.source=https://github.com/Outburn-IL/fume-community
LABEL org.opencontainers.image.description="FUME FHIR Conversion & Mapping Engine"
LABEL org.opencontainers.image.licenses=AGPL-3.0
LABEL org.opencontainers.image.authors="Outburn Ltd."

# Install node-gyp dependencies
RUN apt-get update -y && apt-get install -y \
    build-essential \
    g++

# Update npm
RUN npm install -g npm@^10

# Create app directory
WORKDIR /usr/src/app

# Copy app source
COPY . .

# Install app dependencies
RUN npm ci

# Build app
RUN npm run build

FROM node:22-alpine as runtime

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Start Server
EXPOSE 42420
CMD ["node", "dist/src/app.js"]
