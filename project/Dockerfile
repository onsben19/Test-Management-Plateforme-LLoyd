# ============================================================
# Stage 1 — Build React app
# ============================================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile
COPY . .
RUN npm run build

# ============================================================
# Stage 2 — Serve the built app with Vite preview
# ============================================================
FROM node:20-alpine
WORKDIR /app

# Need vite available at runtime for `vite preview`
COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

# Bring in the production build
COPY --from=builder /app/dist ./dist
# (vite.config needs to be present for preview)
COPY vite.config.* ./

EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
