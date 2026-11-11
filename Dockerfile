# Imagem Node.js 24
FROM node:24-bookworm-slim

# Diretório da aplicação
WORKDIR /app

# Dependências necessárias ao Prisma
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        openssl \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código-fonte
COPY . .

# Gerar Prisma Client com variável temporária
RUN DATABASE_URL="placeholder" npx prisma generate && \
    npm run build && \
    find dist -name "main.js"

# Configuração da aplicação
ENV NODE_ENV=development
ENV PORT=7503

# Porta da aplicação
EXPOSE 7503

# Inicialização da aplicação
CMD ["npm", "run", "start:prod"]