# 🧬 NexDesk Enterprise System Architecture & Topology

This document details the exact repository layout and system design blueprint for the actual production implementation, splitting monolithic concepts into hyper-focused micro-services and specialized domains.

## 🏗️ Monorepo Directory Structure

The repository uses Turborepo for massive typescript scaling.

```
nexdesk-monorepo/
├── apps/
│   ├── web/                     # The Next.js 14 App Router (React Server Components, Main Dashboard)
│   ├── api-gateway/             # Fastify/Node edge routing handling rate-limits & WebSocket auth
│   ├── mobile/                  # React Native / Expo codebase for the Agent PNN (Push Node) iOS/Android app
│   └── admin-panel/             # Solid.js ultra-fast internal admin dashboard
│
├── packages/
│   ├── ui/                      # Shared Tailwind / Radix components library
│   ├── database/                # Supabase schema, typed Prisma/Drizzle clients, migrations
│   ├── logger/                  # Universal structured JSON Datadog transport (Pino)
│   ├── design-system/           # Base tokens, fonts, and dark mode strict rules
│   └── crypto/                  # Our Mock Quantum-Resistant Lattice signing modules
│
├── services/                    # Autonomous Agent Docker Containers (The Engine Room)
│   ├── orchestrator-agent/      # Python/Go: Central nervous system that delegates via EventBridge
│   ├── triage-agent/            # NLP Llama-3 parsing queue (Emails -> JS Objects)
│   ├── cmdb-agent/              # Graph DB parser assessing blast radius of outages
│   ├── execution-agent/         # The dangerous agent allowed to reboot servers and merge PRs
│   └── compliance-agent/        # The regex/DLP engine ripping PCI/HIPAA data out of payloads
│
├── infrastructure/              # Terraform & AWS SAM Templates
│   ├── aws/                     # EventBridge, Lambdas, Elasticache clusters
│   ├── supabase/                # Self-hosted / managed Row-Level Security definitions
│   └── k8s/                     # Helm charts for On-Premise Air-Gapped Banking deployments
│
├── .github/workflows/           # CI/CD Production Pipelines (Snyk, ECR Push, Tests)
└── architecture/                # Agent Protocols & System Maps (Where this file lives)
```

## 🧠 AWS Cognitive Data Flow

1.  **Ingestion (The Edge):**
    *   Emails, Webhooks (Jira, Slack), and UI actions hit `apps/api-gateway`.
    *   API Gateway authenticates via `supabase` JWT and immediately dumps raw JSON into `AWS EventBridge`.
2.  **Triage (The Intake Queue):**
    *   EventBridge routes generic `com.nexdesk.ticket.raw` events to the `triage-agent` Lambda.
    *   Llama-V3 extracts Intent, Severity, Sentiment, and formats it securely (redacting PII).
3.  **The Swarm (Agent Collaboration):**
    *   The `orchestrator-agent` consumes the clean payload. It queries `AWS ElastiCache (Redis)` for historical vectors.
    *   If CMDB assets are mentioned, it fires an `A2A JSON Protocol` message to the `cmdb-agent` requesting Blast Radius calculations.
4.  **Mitigation (Action & Execution):**
    *   Once consensus is reached, the `execution-agent` is triggered.
    *   It might run SSH scripts, invoke webhooks, or open GitHub Pull Requests.
5.  **Audit (The Blockchain LEDGER):**
    *   EVERY single microservice mutation is fired onto an `audit.log` EventBridge queue.
    *   A final Lambda hashes the action (`current_hash = SHA256(prev + payload)`) and stores it into `Supabase / PostgreSQL` as an immutable block.

## 🔐 Compliance Bounds

*   No plain text PII touches the AI models. The `compliance-agent` (running offline regular expressions) intercepts it first.
*   The `execution-agent` runs in its own isolated AWS VPC with severely restricted IAM roles preventing collateral damage.
