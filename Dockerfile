FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev && cp -r public .next/standalone/public && cp -r .next/static .next/standalone/.next/static

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV SCHOOLDESK_DATABASE=/app/.data/schooldesk.sqlite
WORKDIR /app
# Keep tsx available for the owner-only setup/membership/migration CLI.
COPY --from=build --chown=node:node /app /app
USER node
RUN mkdir -p /app/.data
VOLUME ["/app/.data"]
EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
