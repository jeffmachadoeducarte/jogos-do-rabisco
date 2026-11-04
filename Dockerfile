# Jogos do Rabisco: site estático servido pelo nginx
FROM nginx:1.28-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html
RUN rm -f /usr/share/nginx/html/nginx.conf
# confere a configuração no build: se tiver erro, o deploy falha e o site antigo continua no ar
RUN nginx -t
EXPOSE 80
