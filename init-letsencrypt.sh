#!/bin/bash

# init-letsencrypt.sh
# certbot을 사용한 Let's Encrypt SSL 인증서 초기 발급 스크립트
# 사용법: sudo bash init-letsencrypt.sh

DOMAIN="interview.example.com"
EMAIL="admin@example.com"
STAGING=0  # 테스트 시 1로 설정 (Let's Encrypt rate limit 방지)

COMPOSE="docker compose"

# 1) 임시 자체서명 인증서 생성 (nginx 시작용)
echo "### 임시 인증서 생성 중..."
$COMPOSE run --rm --entrypoint "\
  mkdir -p /etc/letsencrypt/live/$DOMAIN" certbot

$COMPOSE run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj '/CN=localhost'" certbot

# 2) nginx 시작
echo "### nginx 시작 중..."
$COMPOSE up -d nginx
sleep 5

# 3) 임시 인증서 삭제
echo "### 임시 인증서 삭제 중..."
$COMPOSE run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/$DOMAIN && \
  rm -rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot

# 4) 실제 인증서 발급
echo "### Let's Encrypt 인증서 발급 요청 중..."

if [ $STAGING != "0" ]; then
  STAGING_ARG="--staging"
else
  STAGING_ARG=""
fi

$COMPOSE run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $STAGING_ARG \
    --email $EMAIL \
    --domain $DOMAIN \
    --rsa-key-size 4096 \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot

# 5) nginx 재시작 (실제 인증서 적용)
echo "### nginx 재시작 중..."
$COMPOSE exec nginx nginx -s reload

echo "### 완료! https://$DOMAIN 에서 확인하세요."
