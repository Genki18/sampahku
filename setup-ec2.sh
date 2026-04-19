#!/bin/bash
# ============================================
# SampahKu - EC2 Setup Script
# Jalankan sekali di EC2 instance baru
# Usage: chmod +x setup-ec2.sh && ./setup-ec2.sh
# ============================================

set -e

echo "🚀 Setting up SampahKu on EC2..."
echo "=================================="

# Update system
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu
echo "✅ Docker installed"

# Install additional tools
sudo apt-get install -y git curl wget htop

# Create app directory
mkdir -p /home/ubuntu/sampahku
echo "✅ App directory created: /home/ubuntu/sampahku"

# Configure Docker to start on boot
sudo systemctl enable docker
sudo systemctl start docker
echo "✅ Docker enabled on startup"

# Open firewall ports (if ufw is active)
if sudo ufw status | grep -q "active"; then
    sudo ufw allow 22/tcp    # SSH
    sudo ufw allow 80/tcp    # HTTP
    sudo ufw allow 443/tcp   # HTTPS (optional)
    echo "✅ Firewall rules added"
fi

echo ""
echo "=================================="
echo "✅ EC2 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Copy .env file: scp -i key.pem .env ubuntu@EC2_IP:/home/ubuntu/sampahku/"
echo "2. Push to GitHub main branch to trigger CI/CD"
echo "3. Or manually: cd sampahku && docker compose up -d"
echo ""
echo "⚠️  NOTE: Log out and back in for Docker group to take effect"
echo "=================================="
