FROM node:24-alpine

WORKDIR /app
RUN npm install -g pnpm
RUN corepack enable

# Copie des fichiers de dépendances
COPY package*.json ./
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml turbo.json ./
COPY packages ./packages
COPY app ./app
COPY . .

#COPY apps ./apps
#COPY examples ./examples
# Installation des dépendances
#RUN pnpm install --shamefully-hoist --frozen-lockfile


#COPY . .
RUN pnpm build
#RUN pnpm --filter @assistant-ui/next build
#RUN pnpm --filter frontend exec next build

# Copie du reste du code

EXPOSE 3000

CMD ["pnpm", "start", "--port","3000"]
