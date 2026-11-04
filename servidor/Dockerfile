FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
# better-sqlite3 traz binário pronto para Alpine (musl); se faltar, compila com as ferramentas.
RUN npm ci --omit=dev || (apk add --no-cache python3 make g++ && npm ci --omit=dev)
RUN apk add --no-cache su-exec
COPY sala.mjs cadastro.mjs ./
ENV PORT=8090 DATA_DIR=/data
EXPOSE 8090
# Sobe como root só para acertar o dono do volume /data (o EasyPanel monta como root) e já cai para o usuário node.
CMD ["sh", "-c", "mkdir -p \"$DATA_DIR\" && chown node:node \"$DATA_DIR\"; exec su-exec node node sala.mjs"]
