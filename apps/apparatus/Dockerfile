FROM node:22-alpine AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /repo

# Copy workspace manifests first for better layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json ./
COPY apps/apparatus/package.json apps/apparatus/tsconfig.json apps/apparatus/
COPY apps/apparatus/src/dashboard/package.json apps/apparatus/src/dashboard/
COPY libs/client/package.json libs/client/

RUN pnpm install --frozen-lockfile

# Copy source after dependencies are installed.
COPY apps/apparatus apps/apparatus
COPY libs/client libs/client

# `pnpm deploy` copies package files + production deps; keep certs/proto/dist available.
RUN pnpm nx run client:build \
  && pnpm nx run apparatus:build \
  && pnpm --filter @apparatus/server deploy --prod /app \
  && cp -r apps/apparatus/dist /app/ \
  && test -d /app/dist \
  && test -f /app/dist/index.js \
  && test -d /app/dist/dist-dashboard \
  && test -d /app/certs \
  && test -d /app/proto

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S apparatus && adduser -S apparatus -G apparatus
COPY --from=build --chown=apparatus:apparatus /app/ ./
USER apparatus

EXPOSE 8090 8443 8091 9000 9001 50051 6379 2525 5514 5140 8444 1883 1344 7946

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8090/healthz || exit 1

CMD ["node", "dist/index.js"]
