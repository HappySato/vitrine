FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=43123
ENV HOSTNAME=0.0.0.0
RUN addgroup -S vitrine && adduser -S vitrine -G vitrine
COPY --from=build /app/public ./public
COPY --from=build --chown=vitrine:vitrine /app/.next/standalone ./
COPY --from=build --chown=vitrine:vitrine /app/.next/static ./.next/static
USER vitrine
EXPOSE 43123
CMD ["node", "server.js"]
