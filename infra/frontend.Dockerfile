FROM node:22-alpine AS build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./frontend/
COPY frontend ./frontend
COPY content ./content
COPY scripts ./scripts

RUN npm install --prefix frontend
RUN npm run build --prefix frontend

FROM nginx:1.27-alpine

COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
