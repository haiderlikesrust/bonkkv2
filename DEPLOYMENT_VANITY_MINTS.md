# Vanity Mints Pool - Deployment Guide

## Issue
When deploying to VPS with Docker, the backend can't find `vanity-mints-pool.json` file.

## Solution

### 1. Ensure File Exists on VPS
Make sure `vanity-mints-pool.json` exists in the project root on your VPS:

```bash
# On your VPS
cd ~/ponk
ls -la vanity-mints-pool.json
```

If the file doesn't exist:
- Copy it from your local machine
- Or generate it: `npm run vanity-mints-gpu`

### 2. Docker Volume Mount
The `docker-compose.yml` now includes a volume mount for the file:

```yaml
volumes:
  - ./vanity-mints-pool.json:/app/vanity-mints-pool.json:ro
```

This mounts the file from your host into the container at `/app/vanity-mints-pool.json`.

### 3. File Path in Code
The backend code looks for the file at:
- Path: `/app/vanity-mints-pool.json` (inside container)
- Which maps to: `./vanity-mints-pool.json` (on host)

### 4. Verify After Deployment

After deploying, check the logs:

```bash
docker compose logs backend | grep -i vanity
```

You should see:
```
📂 Loading X pre-generated vanity mints from JSON file...
   File: /app/vanity-mints-pool.json
```

If you see:
```
ℹ️  No pre-generated vanity mints file found at: /app/vanity-mints-pool.json
```

Then:
1. Check the file exists on host: `ls -la vanity-mints-pool.json`
2. Check file permissions: `chmod 644 vanity-mints-pool.json`
3. Restart container: `docker compose restart backend`

### 5. Troubleshooting

**File not found:**
```bash
# Check if file exists
ls -la ~/ponk/vanity-mints-pool.json

# If missing, copy from local or generate
scp vanity-mints-pool.json user@vps:~/ponk/
```

**Permission denied:**
```bash
chmod 644 vanity-mints-pool.json
```

**File is directory (Docker created it):**
```bash
# Remove the directory Docker created
rm -rf vanity-mints-pool.json
# Copy the actual file
scp vanity-mints-pool.json user@vps:~/ponk/
```

## Notes

- The file is mounted as read-only (`:ro`) for security
- The file is loaded into the database on startup, so it only needs to be present at container start
- You can update the file and restart the container to reload it
- The frontend also needs the file at `frontend/public/vanity-mints-pool.json` (handled separately)

