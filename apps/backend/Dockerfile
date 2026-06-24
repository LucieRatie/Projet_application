FROM node:24-alpine

WORKDIR /app
RUN npm install -g pnpm
COPY package*.json ./
RUN pnpm config get strict-dep-builds
RUN pnpm install
COPY . .

EXPOSE 5000

CMD ["npm", "start"]
