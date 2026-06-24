FROM node:24-alpine

WORKDIR /app
RUN npm install -g pnpm
COPY package*.json ./
RUN pnpm config set ignore-scripts false
RUN pnpm install --no-frozen-lockfile
COPY . .

EXPOSE 5000

CMD ["npm", "start"]
