FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY sala.mjs ./
USER node
ENV PORT=8090
EXPOSE 8090
CMD ["node", "sala.mjs"]
