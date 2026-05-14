# OpenHub: The Autonomous Developer OS

OpenHub is a high-performance, industrial-grade developer orchestration platform designed to enable engineering teams to run autonomously. It combines deep system visibility with AI-driven automation to maximize developer velocity.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1 — Frontend (React 19 + Vite + TanStack Query)     │
│  Dashboard, Repo Browser, Pipeline UI, Studio, Workspace    │
├─────────────────────────────────────────────────────────────┤
│  Layer 2 — Express API (Node.js + SQLite + JWT Auth)       │
│  REST endpoints, real git repos, webhooks, rate limiting    │
├─────────────────────────────────────────────────────────────┤
│  Layer 3 — Orchestrator (UnifiedPipeline + WebSocket)      │
│  AI-driven pipeline: plan → code → review → test → deploy   │
├─────────────────────────────────────────────────────────────┤
│  Layer 4 — MCP Server (VibeServe — 36 tools)               │
│  Ollama/Gemini/OpenAI LLM providers, WCAG AAA validation    │
└─────────────────────────────────────────────────────────────┘
```

## Quickstart

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up VibeServe (MCP Server)

VibeServe is the Python-based MCP server that powers AI pipeline tools.

```bash
# Install vibeserve Python package
npm run mcp:install

# Or manually:
pip install -e vibeserve/.
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys (see Environment Variables below)
```

### 4. Run

```bash
# Development (Express only)
npm run dev

# Full stack (Express + Orchestrator + MCP)
npm run dev:all

# Production
npm run build
npm start
```

### 5. Run Tests

```bash
# E2E tests (starts server automatically)
npm run e2e

# All tests (unit + E2E)
npm run test
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Express server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `ACCESS_TOKEN_SECRET` | JWT access token secret (min 32 chars) | *required* |
| `REFRESH_TOKEN_SECRET` | JWT refresh token secret (min 32 chars) | *required* |
| `GEMINI_API_KEY` | Google Gemini API key (optional) | — |
| `OLLAMA_HOST` | Ollama local endpoint | `http://localhost:11434` |
| `OLLAMA_MODEL` | Ollama model name | `llama3.2` |
| `WS_PORT` | Orchestrator WebSocket port | `3001` |
| `OPENHUB_REPOS_ROOT` | Custom path for repo storage | `~/Documents/openhub/repos` |
| `VIBESERVE_WORKSPACE` | VibeServe workspace root | `.` |
| `E2E_FAST_PIPELINE` | Enable fast pipeline for testing | — |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login (sets cookies) |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |

### Repositories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/repos` | List user's repositories |
| POST | `/api/repos` | Create repository |
| GET | `/api/repos/:owner/:repo/contents` | Browse files |
| PUT | `/api/repos/:owner/:repo/contents` | Update file |

### Git Operations (isomorphic-git)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/repos/:owner/:repo/commits` | Commit history |
| GET | `/api/repos/:owner/:repo/branches` | List branches |
| GET | `/api/repos/:owner/:repo/commits/:sha` | Single commit details |
| GET | `/api/repos/:owner/:repo/diff?sha=` | Changed files in commit |
| POST | `/api/repos/:owner/:repo/commits` | Create commit |

### Pipeline
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pipeline/run` | Trigger pipeline (`mode: 'ai'` for real, default for fast) |
| GET | `/api/pipeline/status/:runId` | Get pipeline status |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings/ssh-keys` | List SSH keys |
| POST | `/api/settings/ssh-keys` | Add SSH key |
| DELETE | `/api/settings/ssh-keys/:id` | Delete SSH key |

### Registry
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/registry` | List toolkit items |
| POST | `/api/registry` | Add toolkit item |
| PATCH | `/api/registry/:id` | Update item status |

### Security
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scan` | Scan file for secrets |
| POST | `/api/audit-logs` | Log audit action |

## VibeServe MCP Tools (36)

### AI Pipeline (7)
`vibe_architect` · `vibe_code` · `vibe_review` · `vibe_verify` · `vibe_iterate` · `vibe_test` · `vibe_deploy`

### UI Generation (4)
`generate_ui_spec` · `validate_ui_spec` · `list_design_systems` · `memory_stats`

### Utilities (7)
`vibe_design` · `vibe_preview` · `vibe_docs` · `vibe_health` · `vibe_audit` · `vibe_compress` · `vibe_benchmark`

### Professional (3)
`vibe_upgrade_design` · `vibe_build_pro` · `supabase_query`/`insert`

### External Integrations (8)
`vercel_deployments` · `github_repo`/`issues` · `cloudflare_dns` · `google_sheets` · `editor_config`/`write`

### Execution (7)
`check_node_env` · `detect_package_manager` · `run_install` · `run_biome` · `run_tsc` · `run_build` · `ingest_learning`

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, React Router 7, TanStack Query, Zustand |
| Styling | Tailwind CSS 4, Framer Motion, Lucide Icons |
| Backend | Express, better-sqlite3, Helmet, express-rate-limit |
| Auth | awesome-node-auth, JWT (15m access + 7d refresh), bcrypt |
| Git | isomorphic-git (pure JS, no native dependencies) |
| AI Pipeline | UnifiedPipeline, VibeServe MCP (36 tools) |
| LLM Providers | Ollama (local), Gemini (cloud), OpenAI, OpenRouter, DeepSeek |
| Testing | Playwright (E2E), Vitest (unit) |
| Charts | ApexCharts, Recharts |

## Security

- **Helmet** security headers on all responses
- **Rate limiting**: 20 req/15min general auth, 10/15min login, 5/60min register
- **JWT** with httpOnly cookies, CSRF protection
- **SQLite** with WAL mode, parameterized queries
- **CSP** headers, CORS credentials properly configured
- **Prompt injection guard** in VibeServe MCP tools

## License

MIT
