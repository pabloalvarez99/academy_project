# CI/CD Pipelines

Continuous Integration and Continuous Delivery/Deployment are fundamental DevOps practices that automate building, testing, and deploying software.

## Definitions

**Continuous Integration (CI)**: Every code change is automatically built and tested. Catch bugs early, keep the main branch always working.

**Continuous Delivery (CD)**: Code is always in a deployable state. Every change that passes tests can be deployed manually.

**Continuous Deployment**: Every change that passes tests is deployed to production automatically (no human approval).

```
Developer pushes code
  → CI: build + test (seconds to minutes)
    → CD: deploy to staging (automatic)
      → Production: manual (Delivery) or automatic (Deployment)
```

## A Typical CI Pipeline

```yaml
# GitHub Actions example
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: '1.22' }
      - run: go build ./...        # Step 1: build
      - run: go test ./...         # Step 2: unit tests
      - run: go vet ./...          # Step 3: static analysis
      - run: golangci-lint run     # Step 4: linting
```

## Pipeline Stages

### 1. Trigger
- Push to branch (`main`, feature branches)
- Pull/Merge Request creation or update
- Scheduled (nightly builds, security scans)
- Manual trigger

### 2. Source
```bash
git clone repo
git checkout $COMMIT_SHA  # exact commit, not branch tip
```

### 3. Build
Compile code, create artifacts:
```bash
go build -o bin/server ./cmd/server
docker build -t myapp:$GIT_SHA .
```

### 4. Test
```bash
go test -race -cover ./...         # unit + race detection
go test -tags integration ./...    # integration tests
```

**Test pyramid**:
```
          [E2E]           # few, slow, brittle
        [Integration]     # some
      [Unit Tests]         # many, fast, reliable
```

### 5. Static Analysis
- **Linters**: style, unused vars, error handling
- **SAST** (Static Application Security Testing): vulnerability scanning
- **Dependency check**: known CVEs in dependencies

### 6. Package/Containerize
```bash
# Build and tag Docker image
docker build -t registry.example.com/myapp:$GIT_SHA .
docker push registry.example.com/myapp:$GIT_SHA
```

### 7. Deploy to Staging
```bash
# Kubernetes: update image tag
kubectl set image deployment/myapp app=registry.example.com/myapp:$GIT_SHA
kubectl rollout status deployment/myapp
```

### 8. Integration/E2E Tests (against staging)

### 9. Promote to Production
- Manual approval gate (Continuous Delivery)
- Or automatic (Continuous Deployment)
- Blue-green, canary, or rolling deployment

## Deployment Strategies

### Rolling Update
Replace instances gradually. Zero downtime if health checks work.
```
v1 v1 v1 v1
v2 v1 v1 v1
v2 v2 v1 v1
v2 v2 v2 v2
```

### Blue-Green Deployment
Two identical environments. Switch traffic at load balancer.
```
Blue (v1) ← traffic
Green (v2) — idle

Deploy v2 to Green → switch load balancer → Green gets traffic
Rollback: switch back to Blue instantly
```

### Canary Deployment
Route a small percentage of traffic to new version:
```
v1 → 95% of users
v2 → 5% of users (canary)

Monitor metrics → gradually increase v2 percentage → full rollout
```

## GitHub Actions Deep Dive

```yaml
name: Deploy
on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE: ${{ github.repository }}

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      # Cache Go modules — speeds up subsequent runs
      - uses: actions/cache@v3
        with:
          path: ~/go/pkg/mod
          key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}

      - name: Run tests
        run: go test -race ./...

      # Build Docker image
      - name: Log in to registry
        run: echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin

      - name: Build and push
        run: |
          docker build -t $REGISTRY/$IMAGE:${{ github.sha }} .
          docker push $REGISTRY/$IMAGE:${{ github.sha }}

      # Deploy (example: SSH to server)
      - name: Deploy to production
        env:
          SSH_KEY: ${{ secrets.DEPLOY_KEY }}
        run: |
          echo "$SSH_KEY" > /tmp/deploy_key && chmod 600 /tmp/deploy_key
          ssh -i /tmp/deploy_key user@server.example.com \
            "docker pull $REGISTRY/$IMAGE:${{ github.sha }} && \
             docker stop app || true && \
             docker run -d --name app -p 8080:8080 $REGISTRY/$IMAGE:${{ github.sha }}"
```

## GitLab CI Example

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  image: golang:1.22
  script:
    - go test -race ./...
  cache:
    paths: [.go-cache/]

build:
  stage: build
  image: docker:24
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

deploy-staging:
  stage: deploy
  environment: staging
  script:
    - kubectl set image deployment/app app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  only: [main]

deploy-prod:
  stage: deploy
  environment: production
  when: manual  # requires human approval
  script:
    - kubectl set image deployment/app app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  only: [main]
```

## Best Practices

1. **Fast feedback**: Keep CI under 10 minutes — slow CI gets ignored
2. **Fail fast**: Run quickest checks first (lint, unit tests before integration tests)
3. **Reproducible builds**: Pin dependency versions, use exact image tags
4. **Secrets management**: Never hardcode secrets; use CI secrets/vault
5. **Cache aggressively**: Dependencies, build artifacts, Docker layers
6. **Test in production-like environments**: Staging should mirror production
7. **Feature flags**: Deploy code without enabling features — decouple deploy from release
8. **Rollback plan**: Always know how to roll back before deploying

## Interview Questions

**Q: What's the difference between CI, CD, and Continuous Deployment?**
A: CI = automatic build + test on every commit. Continuous Delivery = CI + always deployable, manual release gate. Continuous Deployment = CI + automatic deployment to production with no manual step.

**Q: What is a canary deployment?**
A: Route a small percentage of traffic (e.g., 5%) to the new version. Monitor error rates and metrics. If healthy, gradually increase to 100%. If issues, route back to old version instantly. Reduces blast radius of bad deployments.

**Q: How do you handle database migrations in CI/CD?**
A: Run migrations automatically before (or during) deployment. Use backward-compatible migrations (additive only — don't delete columns immediately). Consider feature flags to control new code paths that depend on new schema. Tools: Flyway, Liquibase, golang-migrate.
