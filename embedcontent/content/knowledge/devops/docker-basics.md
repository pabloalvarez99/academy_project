# Docker Fundamentals

Docker packages applications and their dependencies into **containers** — lightweight, portable, isolated environments.

## Key Concepts

### Image vs Container

| Image | Container |
|-------|-----------|
| Read-only blueprint | Running instance of an image |
| Stored in registry | Lives on host machine |
| Built from Dockerfile | Created with `docker run` |
| Layered filesystem | Adds writable layer on top |

### Layers and Union Filesystem

Each Dockerfile instruction creates a new layer. Layers are cached and shared between images:

```
┌─────────────────────────┐
│  Your app code (100MB)  │  ← your layer
├─────────────────────────┤
│  Node.js 20 (50MB)      │  ← cached, shared
├─────────────────────────┤
│  Ubuntu 22.04 (30MB)    │  ← cached, shared
└─────────────────────────┘
```

## Dockerfile

```dockerfile
# Base image
FROM golang:1.23-alpine AS builder

# Set working directory
WORKDIR /app

# Copy dependency files first (better caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binary
RUN CGO_ENABLED=0 go build -o server .

# Final minimal image (multi-stage build)
FROM scratch
COPY --from=builder /app/server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
```

### Multi-stage builds
Use a large build image, copy only the artifact to a minimal runtime image. Reduces final image size dramatically (e.g., 800MB → 10MB for Go).

## Essential Commands

```bash
# Images
docker build -t myapp:v1 .        # build image from Dockerfile
docker pull nginx:latest           # pull from registry
docker push myapp:v1               # push to registry
docker images                      # list local images
docker rmi myapp:v1                # remove image

# Containers
docker run -d -p 8080:80 nginx    # run detached, map host:container port
docker run -it ubuntu bash        # run interactive terminal
docker run --rm myapp             # auto-remove on exit
docker ps                          # list running containers
docker ps -a                       # all containers (including stopped)
docker stop <id>                   # graceful stop (SIGTERM)
docker kill <id>                   # force stop (SIGKILL)
docker rm <id>                     # remove stopped container
docker logs <id>                   # view stdout/stderr
docker exec -it <id> bash         # open shell in running container

# Volumes
docker volume create mydata
docker run -v mydata:/app/data nginx   # named volume
docker run -v $(pwd):/app nginx        # bind mount
```

## Docker Compose

Declarative multi-container orchestration:

```yaml
# docker-compose.yml
version: "3.9"
services:
  web:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DB_URL=postgres://user:pass@db:5432/mydb
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb

volumes:
  pgdata:
```

```bash
docker compose up -d       # start all services detached
docker compose down        # stop and remove containers
docker compose down -v     # also remove volumes
docker compose logs -f web # follow logs for web service
docker compose exec web sh # shell in running service
```

## Networking

Docker creates a default bridge network. Containers on the same network can reach each other by service name:

```python
# Inside container "web", connect to "db" service:
conn = psycopg2.connect(host="db", port=5432, ...)
```

Network types:
- `bridge` (default) — isolated network, containers communicate by name
- `host` — container shares host's network stack
- `none` — no networking

## Best Practices

1. **Use .dockerignore** — exclude `node_modules/`, `.git/`, `*.log`
2. **One process per container** — don't run nginx + app + db in one container
3. **Non-root user** — `USER 1000:1000` in Dockerfile
4. **Pin image versions** — `node:20.11-alpine` not `node:latest`
5. **Order layers for cache** — copy `package.json` before source code
6. **Multi-stage builds** — keep final images small
7. **Health checks** — `HEALTHCHECK CMD curl -f http://localhost/ || exit 1`

## Interview Questions

**Q: What's the difference between CMD and ENTRYPOINT?**
A: ENTRYPOINT is the executable; CMD provides default arguments. With both, `docker run image args` replaces CMD but not ENTRYPOINT.

**Q: How do containers achieve isolation?**
A: Linux namespaces (PID, network, mount, UTS, IPC) provide isolation. cgroups limit resource usage (CPU, memory).

**Q: What is a Docker volume used for?**
A: Persisting data outside the container lifecycle. Container filesystems are ephemeral — volumes survive container restarts and deletions.
