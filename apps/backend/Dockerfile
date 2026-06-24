FROM node:24-alpine

WORKDIR /app
RUN npm install -g pnpm
COPY package*.json ./
pnpm approve-builds
RUN pnpm install
COPY . .

EXPOSE 5000

CMD ["npm", "start"]
