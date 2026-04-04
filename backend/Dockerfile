FROM node:20-slim

# Install OpenSSL for Prisma compatibility
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

EXPOSE 3005

CMD ["npm", "run", "dev"]
