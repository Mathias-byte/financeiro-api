# Imagem do MS Financeiro (NestJS + Prisma) — build em duas etapas:
# a etapa "build" tem as devDependencies (prisma CLI, typescript); a imagem final leva só o código
# compilado e as dependências de produção, e roda como usuário "node" (não root).

# ───────────── etapa 1: build ─────────────
FROM node:24-slim AS build

# O Prisma precisa do OpenSSL para falar com o MySQL
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1) dependências (camada em cache enquanto package*.json não mudar)
COPY package*.json ./
RUN npm ci

# 2) Prisma Client gerado a partir do schema (o Prisma 7 lê a config em prisma.config.ts)
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json tsconfig.build.json ./
# o generate só lê o schema e não conecta no banco, então não precisa de DATABASE_URL
RUN npx prisma generate

# 3) código + build (tsc), e remoção das devDependencies
COPY src ./src
RUN npx tsc -p tsconfig.build.json && npm prune --omit=dev

# ───────────── etapa 2: imagem final ─────────────
FROM node:24-slim

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node
EXPOSE 7523

# Docker passa a marcar o container como "healthy"/"unhealthy" consultando GET /health (API + banco).
# A imagem não tem curl/wget, então a checagem usa o fetch do próprio Node.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||7523)+'/condominio/financeiro/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# As tabelas já existem no servidor (criadas pelo professor a partir de database/Financeiro.sql)
CMD ["node", "dist/main.js"]
