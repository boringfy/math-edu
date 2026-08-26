# Bakes the content at build time and serves it.
#
# The packs are produced during the image build rather than at boot, so a
# container either starts with a complete, verified set of content or fails
# to build. Nothing is generated on a running server.

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --workspace @math-edu/backend --include-workspace-root

COPY backend/ backend/
RUN npm run bake --workspace @math-edu/backend

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY backend/package.json backend/
RUN npm ci --omit=dev --workspace @math-edu/backend --include-workspace-root

COPY backend/src backend/src
COPY backend/tsconfig.json backend/
COPY --from=build /app/backend/dist backend/dist

WORKDIR /app/backend
EXPOSE 8787
ENV PORT=8787

# tsx is a runtime dependency, not a dev one — the server executes TypeScript
# directly. Installed with the image rather than fetched by npx at start, so a
# container starts on a box with no internet and does not depend on a registry
# being up at the moment it happens to restart.

# The manifest is read from disk per request, so a rebake can be dropped in
# over a running container without a restart.
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:8787/healthz || exit 1

CMD ["npx", "tsx", "src/server/index.ts"]
