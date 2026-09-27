# One image = the whole app: SvelteKit server, SQLite (on the /data volume),
# and Chromium for PDF rendering (used from build step 4).

# ── Build
FROM node:22-bookworm-slim AS build
WORKDIR /app
# Toolchain in case better-sqlite3 has no prebuilt binary for this platform
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ── Runtime
FROM node:22-bookworm-slim
ARG APP_VERSION=dev
RUN apt-get update && apt-get install -y --no-install-recommends \
		tini chromium fonts-liberation fonts-noto-core fonts-dejavu-core \
	&& rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
	APP_ENV=production \
	APP_VERSION=${APP_VERSION} \
	PORT=3000 \
	DATABASE_PATH=/data/composer.sqlite \
	CHROMIUM_PATH=/usr/bin/chromium
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["npm", "start"]
