FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN pnpm install
COPY . .

EXPOSE 5000

CMD ["npm", "start"]
