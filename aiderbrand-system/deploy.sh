#!/usr/bin/env bash
# deploy.sh — VPS first-run setup for aiderbrand-system
# Run as root or sudo on Ubuntu 22.04
set -euo pipefail

APP_DIR="/opt/aiderbrand"

echo "==> Installing Docker..."
apt-get update -q
apt-get install -y -q ca-certificates curl gnupg lsb-release

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -q
apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable --now docker

echo "==> Docker installed: $(docker --version)"
echo "==> Docker Compose installed: $(docker compose version)"

echo ""
echo "==> Next steps:"
echo ""
echo "  1. Clone the repo:"
echo "     git clone https://github.com/Aiderbrand/Customer-system.git $APP_DIR"
echo "     cd $APP_DIR/aiderbrand-system"
echo ""
echo "  2. Create your .env from the example:"
echo "     cp env.production.example .env"
echo "     nano .env   # fill in secrets"
echo ""
echo "  3. Make sure DNS for clientes.aiderbrand.com and apicustomers.aiderbrand.com"
echo "     points to this server's IP before starting (Let's Encrypt needs it)."
echo ""
echo "  4. Build and start:"
echo "     docker compose up -d --build"
echo ""
echo "  5. Check logs:"
echo "     docker compose logs -f"
echo ""
echo "Done. Traefik will handle TLS automatically on first request."
