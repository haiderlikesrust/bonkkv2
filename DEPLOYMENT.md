# Deployment Guide

This guide explains how to deploy bonkv2.fun to your VPS with automatic deployment via GitHub Actions.

## Prerequisites

- VPS with Docker and Docker Compose installed
- Git installed on VPS
- GitHub repository set up
- SSH access to your VPS

## Initial VPS Setup

### 1. Install Docker and Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Clone Repository on VPS

```bash
cd /path/to/your/projects
git clone <your-repo-url> bonkv2
cd bonkv2
```

### 3. Create .env File

Create a `.env` file in the project root with all necessary environment variables:

```env
PORT=3001
NODE_ENV=production
PUMP_PORTAL_URL=https://pumpportal.fun
HELIUS_API_KEY=your_helius_api_key
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your_helius_api_key
JWT_SECRET=your_secret_key_change_this
MORALIS_API_KEY=your_moralis_api_key
CORS_ORIGIN=https://yourdomain.com
```

### 4. Create Data Directory

```bash
mkdir -p data
chmod 755 data
```

## GitHub Actions Setup (Auto-Deploy)

### 1. Generate SSH Key for GitHub Actions

On your local machine:

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_deploy
```

### 2. Copy Public Key to VPS

```bash
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub user@your-vps-ip
```

### 3. Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add:

- `SSH_PRIVATE_KEY`: Contents of `~/.ssh/github_actions_deploy` (private key)
- `VPS_HOST`: Your VPS IP address or domain
- `VPS_USER`: SSH username (e.g., `root` or `ubuntu`)

### 4. Update Deploy Script Path

Edit `.github/workflows/deploy.yml` and update the path in the SSH command:

```yaml
cd ~/bonkv2 || cd /var/www/bonkv2 || exit 1  # Update to your actual path
```

Common paths:
- `~/bonkv2` (home directory)
- `/var/www/bonkv2` (web directory)
- `/opt/bonkv2` (opt directory)

## Manual Deployment

If you want to deploy manually:

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

Or using Docker Compose directly:

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Docker Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart Services

```bash
docker-compose restart backend
docker-compose restart frontend
# Or all
docker-compose restart
```

### Stop Services

```bash
docker-compose down
```

### Update Containers

```bash
git pull
docker-compose build --no-cache
docker-compose up -d
```

## Environment Variables

Make sure to set these in your `.env` file:

- `PORT`: Backend port (default: 3001)
- `NODE_ENV`: Set to `production`
- `HELIUS_API_KEY`: Your Helius API key for Solana RPC
- `JWT_SECRET`: Secret key for JWT tokens (change this!)
- `MORALIS_API_KEY`: Moralis API key for chart data
- `CORS_ORIGIN`: Your frontend domain

## Nginx Configuration

The frontend uses nginx. To customize, edit `nginx.conf` and rebuild:

```bash
docker-compose build frontend
docker-compose up -d frontend
```

## Domain Setup (Optional)

If you have a domain, update your DNS to point to your VPS IP, then:

1. Update `CORS_ORIGIN` in `.env` to your domain
2. Update nginx.conf to handle your domain
3. Consider using Let's Encrypt for HTTPS

## Troubleshooting

### Containers won't start

```bash
# Check logs
docker-compose logs

# Check if ports are available
netstat -tulpn | grep :3001
netstat -tulpn | grep :80
```

### Database issues

```bash
# Check data directory permissions
ls -la data/

# Make sure data directory is writable
chmod 755 data
```

### Build fails

```bash
# Clean build
docker-compose down
docker system prune -a
docker-compose build --no-cache
```

## Security Notes

1. **Never commit .env file** - It's in .gitignore
2. **Change JWT_SECRET** - Use a strong random secret
3. **Use HTTPS in production** - Set up SSL/TLS certificates
4. **Firewall** - Only expose ports 80 (HTTP) and optionally 443 (HTTPS)
5. **SSH keys** - Use SSH keys instead of passwords

## Auto-Deploy

Once set up, every push to `main` or `master` branch will automatically:
1. Trigger GitHub Actions
2. SSH into your VPS
3. Pull latest changes
4. Rebuild Docker containers
5. Restart services

Check deployment status in GitHub Actions tab of your repository.

