FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4200

# Start angular app exposing it to the host network
CMD ["npx", "ng", "serve", "--host", "0.0.0.0"]
