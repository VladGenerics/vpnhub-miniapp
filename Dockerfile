# Собирает одно приложение (APP=miniapp или admin) и отдаёт статику через nginx.
#   docker build --build-arg APP=admin --build-arg VITE_API_URL=https://api.example.com/api -t vpnhub-admin .
# VITE_* вшиваются при сборке: поменяли - пересоберите образ.

FROM node:22-alpine AS build
WORKDIR /src

# сначала только package.json, чтобы слой с зависимостями кэшировался
COPY package.json package-lock.json ./
COPY apps/miniapp/package.json apps/miniapp/
COPY apps/admin/package.json apps/admin/
COPY packages/shared/package.json packages/shared/
RUN npm ci --no-audit --no-fund

COPY . .

ARG APP=miniapp
ARG VITE_API_URL=
ARG VITE_USE_MOCKS=false
ARG VITE_TG_BOT_ID=
ARG VITE_TG_BOT_USERNAME=
# только для админки: путь, если она на домене кабинета, например /admin/
ARG VITE_BASE_PATH=/
ENV VITE_API_URL=$VITE_API_URL \
    VITE_USE_MOCKS=$VITE_USE_MOCKS \
    VITE_TG_BOT_ID=$VITE_TG_BOT_ID \
    VITE_TG_BOT_USERNAME=$VITE_TG_BOT_USERNAME \
    VITE_BASE_PATH=$VITE_BASE_PATH
RUN npm run build -w @vpnhub/$APP && mv apps/$APP/dist /dist

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /dist /usr/share/nginx/html
EXPOSE 80
