FROM node:24-alpine

WORKDIR /app
RUN npm install -g pnpm
RUN corepack enable

# Copie des fichiers de dépendances
COPY package*.json ./
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml turbo.json ./
COPY packages ./packages
COPY apps ./apps
# Installation des dépendances
RUN pnpm install --frozen-lockfile


#COPY . .
RUN pnpm --filter frontend build

# Copie du reste du code

EXPOSE 3000

CMD ["pnpm","--filter","frontend", "start", "--port","3000"]
