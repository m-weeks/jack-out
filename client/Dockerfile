FROM oven/bun:latest as bun

COPY . /app
WORKDIR /app

RUN bun run build

FROM nginx:1.25.2

COPY --from=bun /app/dist /usr/share/nginx/html