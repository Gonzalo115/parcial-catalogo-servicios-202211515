FROM node:22.22.0-alpine AS build
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY backend/tests ./tests
COPY db/migrations ./migrations
COPY data/CatalogoServicios.xlsx ./data/CatalogoServicios.xlsx
RUN npm run build && npm run test:embedded
RUN npm prune --omit=dev

FROM node:22.22.0-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/migrations ./migrations
COPY --from=build --chown=node:node /app/tests ./tests
USER node
EXPOSE 3000
CMD ["sh", "-c", "node dist/scripts/migrate.js && exec node dist/main.js"]
