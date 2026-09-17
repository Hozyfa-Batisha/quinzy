FROM node:22-alpine AS build

WORKDIR /app

COPY package.json lessons.config.json ./
COPY scripts ./scripts
COPY Sources ./Sources
COPY assets ./assets

# RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
COPY --from=build /app/assets /usr/share/nginx/html/assets

EXPOSE 8080
