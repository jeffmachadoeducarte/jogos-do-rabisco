# Jogos do Rabisco: site estático servido pelo nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html
COPY .htpasswd /etc/nginx/.htpasswd
RUN rm -f /usr/share/nginx/html/.htpasswd
EXPOSE 80
