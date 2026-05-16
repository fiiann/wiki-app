#!/bin/bash
# Usage: ./deploy-setup.sh

set -e

echo "=== Wiki App — Dokploy Deployment Setup ==="
echo ""
read -p "Enter your domain (e.g. wiki.myserver.com): " DOMAIN

# Write docker-compose.yml
cat > docker-compose.yml << EOF
services:
  wiki-app:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      WIKI_ROOT: /app/wiki
    volumes:
      - /home/ubuntu/wiki:/app/wiki
    restart: unless-stopped
    networks:
      - dokploy-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.wiki-app.rule=Host(\`${DOMAIN}\`)"
      - "traefik.http.routers.wiki-app.entrypoints=websecure"
      - "traefik.http.routers.wiki-app.tls.certresolver=letsencrypt"
      - "traefik.http.services.wiki-app.loadbalancer.server.port=3001"

networks:
  dokploy-network:
    external: true
EOF

# Write .dockerignore
cat > .dockerignore << 'EOF'
node_modules
dist
.git
*.md
bun.lock
EOF

echo ""
echo "✓ docker-compose.yml created (domain: ${DOMAIN})"
echo "✓ .dockerignore created"
echo ""
echo "=== Next steps in Dokploy dashboard (http://YOUR_VPS_IP:3000) ==="
echo "1. Create Project → name it 'wiki-app'"
echo "2. Inside project → Create Service → choose 'Compose'"
echo "3. Source: Path → /home/ubuntu/wiki-app"
echo "   Compose file: docker-compose.yml"
echo "4. Click Deploy"
echo "5. Point DNS: A record for ${DOMAIN} → this VPS IP"
echo ""
echo "Done! Wiki will be live at https://${DOMAIN} after deploy + DNS propagation."
