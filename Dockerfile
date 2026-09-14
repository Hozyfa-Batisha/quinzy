# The application is a static HTML/CSS/JavaScript site. No Node runtime is
# needed in production because the generated lesson data is committed to the
# image.
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
COPY assets /usr/share/nginx/html/assets

EXPOSE 8080

