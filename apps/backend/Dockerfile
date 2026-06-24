FROM node:24-slim

WORKDIR /app
RUN npm install -g pnpm
COPY package*.json ./
#RUN pnpm config set enable-pre-post-scripts true
RUN pnpm install --unsafe-perm
COPY . .

EXPOSE 5000

CMD ["npm", "start"]
