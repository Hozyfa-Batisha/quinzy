FROM node:22-alpine

RUN apk add --no-cache python3 make g++ linux-headers

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# Expose the API port
EXPOSE 3000

# Run the backend
CMD ["node", "server.js"]
