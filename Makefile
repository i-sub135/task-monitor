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

# storage/attachment dibikin dulu biar dimiliki user host, bukan root (container jalan sebagai uid 1000).
docker-up:
	mkdir -p storage/attachment
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f app
