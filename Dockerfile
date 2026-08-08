FROM node:22-slim AS client-build

WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:22-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev && npm cache clean --force

COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist

USER node
EXPOSE 8080

CMD ["node", "server/index.js"]
