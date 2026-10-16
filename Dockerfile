FROM node:24-alpine AS builder

WORKDIR /src/main

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build


FROM node:24-alpine AS production

WORKDIR /src/main

COPY package*.json ./
RUN npm ci --omit=dev

ENV NODE_ENV=production

COPY --from=builder --chown=node:node /src/main/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
