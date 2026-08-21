# MicroShop Reforged

MicroShop is a full-stack microservices e-commerce application. 
This project is a personal journey to rebuild the entire DevOps lifecycle for this application from scratch, moving from local execution to a fully automated cloud-native Kubernetes deployment.

## Architecture & Services

The application consists of the following microservices:
- **frontend**: Next.js user interface.
- **api-gateway**: NGINX reverse proxy routing external HTTP requests to the correct backend services.
- **auth-service**: Node.js service for user authentication, backed by PostgreSQL.
- **catalog-service**: Node.js service for managing the product catalog, backed by MongoDB.
- **cart-service**: Node.js service for managing shopping carts, backed by Redis for high performance.
- **checkout-service**: Node.js service for processing orders and publishing events, backed by PostgreSQL.
- **email-service**: Node.js service for sending emails asynchronously by consuming RabbitMQ events.

## Roadmap

Over the course of this project, I will be building the following components on top of the base application code:

- **Phase 1: Containerization**: Writing Dockerfiles and setting up Docker Compose.
- **Phase 2: CI Pipeline**: Setting up GitHub Actions for testing and building images.
- **Phase 3: Kubernetes Deployment**: Creating raw K8s manifests for local deployment via Minikube/Kind.
- **Phase 4: Infrastructure as Code (IaC)**: Provisioning environments using Terraform.
- **Phase 5: Continuous Deployment (CD)**: Automating cluster deployments.
- **Phase 6: Monitoring & Observability**: Setting up Prometheus and Grafana for metrics and dashboards.
