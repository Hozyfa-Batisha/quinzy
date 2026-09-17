FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expose the API port
EXPOSE 3000

# Run the backend
CMD ["node", "server.js"]
