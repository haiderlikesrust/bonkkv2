# Docker Deployment Quick Guide

## Quick Start

1. **Clone repository on VPS:**
   ```bash
   git clone <your-repo-url> ponk
   cd ponk
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   nano .env
   ```

3. **Update docker-compose.yml:**
   - Set `VITE_API_URL` in frontend build args to your backend URL
   - If backend and frontend on same server: `http://backend:3001`
   - If separate: `http://your-backend-domain:3001`

4. **Build and start:**
   ```bash
   docker-compose up -d --build
   ```

5. **Check logs:**
   ```bash
   docker-compose logs -f
   ```

## Important Notes

- Make sure ports 80 and 3001 are open in your firewall
- The `.env` file should NOT be committed to git
- Database files will be stored in `./data` directory (make sure it's writable)
- For production, set up HTTPS/SSL certificates

## Auto-Deploy Setup

1. Generate SSH key: `ssh-keygen -t ed25519 -f ~/.ssh/github_actions`
2. Copy public key to VPS: `ssh-copy-id -i ~/.ssh/github_actions.pub user@vps`
3. Add private key to GitHub Secrets as `SSH_PRIVATE_KEY`
4. Add `VPS_HOST` and `VPS_USER` to GitHub Secrets
5. Update path in `.github/workflows/deploy.yml` (line with `cd ~/ponk`)

## Environment Variables

Required in `.env`:
- `PORT=3001`
- `HELIUS_API_KEY=your_key`
- `JWT_SECRET=your_secret`
- `MORALIS_API_KEY=your_key`
- `CORS_ORIGIN=your_domain` (or * for development)

