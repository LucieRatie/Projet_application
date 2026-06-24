FROM node:24-alpine

WORKDIR /app
RUN npm install -g pnpm
RUN corepack enable

# Copie des fichiers de dépendances
COPY package*.json ./
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml turbo.json ./
COPY packages ./packages

# Installation des dépendances
RUN pnpm install


RUN pnpm build

# Copie du reste du code
COPY . .

EXPOSE 3000

CMD ["pnpm", "start", "--port","3000"]
