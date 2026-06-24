FROM node:24-alpine

WORKDIR /app
RUN npm install -g pnpm
COPY package*.json ./
#RUN pnpm config set enable-pre-post-scripts true
COPY . .
RUN pnpm install


EXPOSE 5000

CMD ["npm","run", "start"]
