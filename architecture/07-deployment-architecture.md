# Architecture: Deployment & DevOps

## Docker Setup

### docker-compose.yml (Development)

```yaml
version: '3.9'

services:
  mongodb:
    image: mongo:7
    container_name: supercrm-mongo
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    container_name: supercrm-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: supercrm-backend
    restart: unless-stopped
    env_file: ./backend/.env
    ports:
      - "4000:4000"
    volumes:
      - ./backend/src:/app/src
    depends_on:
      - mongodb
      - redis

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: supercrm-frontend
    restart: unless-stopped
    env_file: ./frontend/.env.local
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
    depends_on:
      - backend

  ai-service:
    build:
      context: ./ai-service
    container_name: supercrm-ai
    ports:
      - "8000:8000"
    depends_on:
      - redis

volumes:
  mongo_data:
```

### Production Multi-Stage Dockerfiles

```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 4000
USER node
CMD ["node", "dist/server.js"]
```

## AWS Production Architecture

```
Region: ap-south-1 (Mumbai)

VPC (10.0.0.0/16)
├── Public Subnets (10.0.1.0/24, 10.0.2.0/24)
│   ├── Application Load Balancer
│   └── NAT Gateway
├── Private Subnets (10.0.3.0/24, 10.0.4.0/24)
│   ├── ECS Fargate Cluster
│   │   ├── backend-service    (2–10 tasks)
│   │   ├── worker-service     (2–5 tasks)
│   │   ├── ai-service         (2 tasks)
│   │   └── frontend-service   (2–5 tasks)
│   ├── ElastiCache Redis
│   └── Secrets Manager

External Services:
  ├── MongoDB Atlas (M30 dedicated, VPC Peering)
  ├── AWS S3 (media, certificates)
  ├── AWS SES (transactional email)
  ├── AWS CloudFront (CDN)
  └── AWS ECR (container registry)
```

## CI/CD Pipeline (.github/workflows/ci.yml)

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test & Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm run test:ci -- --coverage

  build-and-push:
    name: Build & Push Images
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1
      - name: Login to ECR
        run: aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
      - name: Build & Push Backend
        run: |
          docker build -t $ECR_REGISTRY/supercrm-backend:$GITHUB_SHA ./backend
          docker push $ECR_REGISTRY/supercrm-backend:$GITHUB_SHA

  deploy:
    name: Deploy to ECS
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Update ECS Service
        run: |
          aws ecs update-service \
            --cluster supercrm-prod \
            --service backend-service \
            --force-new-deployment
```

## Environment Management

```
.env.example          # Template committed to repo
.env                  # Local dev (gitignored)
AWS Secrets Manager   # Production secrets
GitHub Secrets        # CI/CD secrets
```
