#!/bin/bash

# renew-cert.sh
# Let's Encrypt 인증서 자동 갱신 스크립트
# crontab에 등록: 0 0 */15 * * /path/to/renew-cert.sh >> /var/log/certbot-renew.log 2>&1

cd "$(dirname "$0")"

docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload
