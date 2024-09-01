FROM node:22 as builder

# Install node-gyp dependencies
RUN apt-get update -y && apt-get install -y \
    build-essential \
    g++

# Update npm
RUN npm install -g npm@^10

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# COPY package*.json ./
# COPY tsconfig.json ./
COPY . .
RUN npm install

# Bundle app source
# COPY . .

# Build app
RUN npm run build

FROM node:22-alpine as runtime

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Start Server
EXPOSE 42420
CMD ["node", "dist/src/app.js"]
