FROM node:24-alpine

WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances
RUN pnpm install
RUN pnpm build

# Copie du reste du code
COPY . .

EXPOSE 3000

CMD ["npm", "start", "--port","3000"]
