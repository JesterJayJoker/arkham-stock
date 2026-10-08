FROM node:22-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production PORT=8787 CACHE_FILE=/data/cache.json
RUN mkdir -p /data && chown -R node:node /app /data
USER node
EXPOSE 8787
CMD ["node","backend/server.mjs"]
