.PHONY: install dev build check test docker-build docker-up docker-down docker-logs

install:
	npm install

dev:
	npm run dev

build:
	npm run build

check:
	npm run check

test:
	npm test

docker-build:
	docker compose build

# storage/attachment dibikin dulu biar dimiliki user host, bukan root. Container jalan sebagai uid/gid user itu
# (APP_UID/APP_GID), supaya bisa nulis lampiran ke folder yang di-mount.
docker-up:
	mkdir -p storage/attachment
	APP_UID=$$(id -u) APP_GID=$$(id -g) docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f app
