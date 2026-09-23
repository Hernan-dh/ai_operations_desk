FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js case-store.js index.html app.js styles.css ./
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "server.js"]
