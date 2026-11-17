# The web image (#13): builds the SPA and serves it with nginx, which also forwards /api and
# /health to the API container, so the browser sees one origin (D6). Build from the repository root:
#   docker build -f apps/web/Dockerfile .
# The build stage is Debian-based: the lockfile is made on Ubuntu, so the glibc builds of Vite's
# native tools (rollup, lightningcss, tailwind oxide) are the ones it reliably contains.
FROM node:26-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @lm/web --include-workspace-root=false
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build -w @lm/web

FROM nginx:1.29-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
