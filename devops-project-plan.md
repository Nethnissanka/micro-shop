# DevOps Fundamentals Project — "MicroShop Reforged"

**Goal:** Take the MicroShop codebase and rebuild the entire DevOps lifecycle yourself — container to CI to IaC to K8s to monitoring — so every piece is something you built and can explain in an interview.

**Timeline:** ~2 weeks, one phase at a time. Don't move to the next phase until the current one actually works end-to-end.

---

## Phase 0 — Setup & Cleanup (Day 1)

- [ ] Download the MicroShop code as a zip (don't fork/clone with old git history — you want a clean history that's yours)
- [ ] Strip out anything you didn't build or don't need: old CI/CD configs (Terraform, GitHub Actions, Helm charts from the original), old Azure-specific files, unused services, stale docs
- [ ] Keep: the actual application source code for each microservice (frontend + backend services)
- [ ] Init a **new** git repo, first commit = "Initial import: MicroShop application code"
- [ ] Write a stub README: what MicroShop is, what services it has, what you're about to build on top of it
- [ ] Decide your service list — write down each microservice and what it does (you'll need this for Docker/K8s later)

**Checkpoint:** App runs locally the old-fashioned way (`npm start` / `python manage.py runserver` etc. per service) so you know the baseline works before touching Docker.

---

## Phase 1 — Containerization (Days 2-3)

- [ ] Write a **Dockerfile per service** from scratch (no copying old ones)
  - Multi-stage build (build stage + slim runtime stage)
  - Non-root user
  - `.dockerignore` per service
  - Pin base image versions (don't use `:latest`)
- [ ] Build and run each container individually, confirm it starts and responds
- [ ] Write a `docker-compose.yml` to run all services together locally (this becomes your "does it all work together" sanity check before K8s)
- [ ] Confirm inter-service communication works via docker-compose networking

**Checkpoint:** `docker-compose up` brings up the whole app, frontend can talk to backend services.

**Skills gained:** Dockerfile best practices, multi-stage builds, container networking.

---

## Phase 2 — CI Pipeline (Days 4-5)

- [ ] Set up GitHub Actions workflow(s):
  - Lint + run tests on every push/PR
  - Build Docker images
  - Push images to GHCR (GitHub Container Registry — free, integrates cleanly)
  - Tag images properly (git SHA + `latest` on main)
- [ ] Add branch protection: PRs must pass CI before merge
- [ ] Use a matrix build if you have multiple services, so each builds independently

**Checkpoint:** Push a commit → see it lint, test, build, and land in GHCR automatically.

**Skills gained:** CI design, image tagging strategy, GitHub Actions workflows.

---

## Phase 3 — Kubernetes Deployment (Days 6-8)

- [ ] Install `minikube` (or `kind`) locally
- [ ] Write your **own** K8s manifests per service (not Helm yet — raw YAML first so you understand what's underneath):
  - `Deployment` (with resource requests/limits, readiness/liveness probes)
  - `Service` (ClusterIP for internal, maybe NodePort/Ingress for frontend)
  - `ConfigMap` for non-secret config
  - `Secret` for credentials/API keys
- [ ] Deploy everything, confirm the app works inside the cluster the same way it did in docker-compose
- [ ] (Optional, if time allows) Convert manifests into a Helm chart once raw YAML works — this shows you understand what Helm abstracts

**Checkpoint:** `kubectl apply -f .` (or `helm install`) brings up the full app on minikube, and it's reachable.

**Skills gained:** K8s core objects, probes, config/secret management, service networking.

---

## Phase 4 — Infrastructure as Code (Days 9-10)

- [ ] Write Terraform to provision your environment. Even locally this counts:
  - Terraform's `kubernetes` provider to create namespaces, deployments, services declaratively
  - Or Terraform's `helm` provider to install your chart
- [ ] Use variables + a `terraform.tfvars` (don't hardcode)
- [ ] Set up remote state if you want to go further (even a local backend with clear structure is fine for a personal project)
- [ ] Document: `terraform plan` / `terraform apply` workflow in your README

**Checkpoint:** You can destroy and recreate your entire environment with `terraform apply`.

**Skills gained:** IaC principles, Terraform state, provider-based provisioning (transferable to AWS/Azure later).

---

## Phase 5 — Continuous Deployment (Day 11)

- [ ] Extend GitHub Actions: on merge to `main`, auto-deploy to your cluster
  - Simplest version: a workflow step that runs `kubectl apply` or `terraform apply` against your cluster
  - (Stretch goal, separate future project: ArgoCD/GitOps — mention it in your README as "next steps" even if you don't build it now)

**Checkpoint:** Merge a small code change → see it automatically rebuilt and redeployed without touching the terminal.

**Skills gained:** CD pipeline design, deployment automation.

---

## Phase 6 — Monitoring & Observability (Days 12-13)

- [ ] Deploy Prometheus + Grafana into the cluster (via Helm chart is fine here — you already understand Helm's purpose from Phase 3)
- [ ] Expose basic app metrics (request count, latency, error rate — even simple ones)
- [ ] Build 1-2 real Grafana dashboards for your actual services, not just default ones
- [ ] (Optional) Set up a basic alert rule (e.g. "pod restart count > X")

**Checkpoint:** You can open Grafana and see live metrics from your own running app.

**Skills gained:** Observability stack, PromQL basics, dashboard design.

---

## Phase 7 — Documentation & Polish (Day 14)

- [ ] Write a proper README:
  - Architecture diagram (even a simple one)
  - How to run it (docker-compose for quick local, K8s for "production-like")
  - What each phase demonstrates
  - What you'd add next (ArgoCD, security scanning, multi-cloud, etc.)
- [ ] Clean commit history if needed (doesn't need to be perfect, just coherent)
- [ ] Add this project to your CV/LinkedIn with a one-line summary of the full pipeline

---

## Notes as you go
Add anything you get stuck on or want to revisit here — keep this file updated as your progress log.
