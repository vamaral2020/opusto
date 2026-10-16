# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=24.19.0

FROM node:${NODE_VERSION}-alpine AS base
RUN apk add --no-cache libc6-compat \
  && npm install --global pnpm@11.28.5
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
  PNPM_HOME=/pnpm \
  PATH=/pnpm:$PATH

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile

FROM dependencies AS development
ENV NODE_ENV=development
CMD ["pnpm", "dev"]

FROM dependencies AS builder
COPY . .
ENV NODE_ENV=production \
  DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
  PAYLOAD_SECRET=build-only-secret-not-used-at-runtime \
  SITE_URL=http://localhost:3000
RUN pnpm build

FROM base AS production-dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-prod,target=/pnpm/store \
  pnpm install --prod --frozen-lockfile

FROM base AS runner
ENV NODE_ENV=production \
  HOSTNAME=0.0.0.0 \
  PORT=3000 \
  XDG_CACHE_HOME=/home/nextjs/.cache \
  pnpm_config_pm_on_fail=error \
  pnpm_config_verify_deps_before_run=false

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs \
  && mkdir -p /app/media /pnpm/store /home/nextjs/.cache \
  && chown -R nextjs:nodejs /app/media /pnpm /home/nextjs

COPY --from=production-dependencies --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/tsconfig.json ./
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts

USER nextjs
EXPOSE 3000
VOLUME ["/app/media"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["pnpm", "start"]
