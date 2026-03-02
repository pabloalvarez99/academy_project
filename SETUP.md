# Setup Guide — New Machine

## 1. Clone the repo

```bash
git clone https://github.com/pabloalvarez99/academy_project.git ACADEMY
cd ACADEMY
```

## 2. Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

## 3. Copy Claude user settings (plugins + commands)

Copy the project-level config to your user-level Claude directory:

**Linux/Mac:**
```bash
cp .claude/settings.json ~/.claude/settings.json
cp .claude/commands/* ~/.claude/commands/
```

**Windows (PowerShell):**
```powershell
Copy-Item .claude\settings.json $env:USERPROFILE\.claude\settings.json
Copy-Item .claude\commands\* $env:USERPROFILE\.claude\commands\
```

This installs the following plugins automatically on next `claude` run:
- `superpowers` — skills system (brainstorming, TDD, debugging, etc.)
- `claude-mem` — persistent cross-session memory
- `context7` — up-to-date library docs
- `serena` — semantic code editing
- `frontend-design` — production-grade UI generation
- `feature-dev` — guided feature development
- `code-review` — pre-commit review
- `commit-commands` — commit/push/PR workflow
- `code-simplifier` — refactor cleanup

## 4. Install Node.js

Requires **Node.js 18+**. Download from https://nodejs.org or use a version manager:

```bash
# With nvm (Linux/Mac)
nvm install 22 && nvm use 22

# With fnm (cross-platform)
fnm install 22 && fnm use 22
```

## 5. Install dependencies

```bash
npm install
```

> No native compilation required — the app uses `sql.js` (WASM) instead of native SQLite.

## 6. Run in dev mode

```bash
npm run dev
```

Opens the Electron app with hot-reload. Changes to `src/` and `electron/` are picked up automatically.

## 7. Build for production

```bash
# TypeScript check
npx tsc --noEmit

# Build renderer + main bundles
npm run build

# Package into installer (dist/)
npm run package
```

Output: `dist/EKS Setup 1.0.0.exe` (Windows), `dist/EKS-1.0.0.dmg` (Mac), `dist/EKS-1.0.0.AppImage` (Linux)

## Runtime requirements

These are needed at runtime to execute exercises (not for building the app itself):

| Language | Required for |
|----------|-------------|
| Node.js 18+ | TypeScript/JavaScript exercises |
| Python 3.10+ | Python exercises |
| Java 17+ | Java exercises |
| Rust (rustc) | Rust exercises |
| gcc/clang | C and C++ exercises |
| Go 1.21+ | Go exercises |

## Project structure

```
ACADEMY/
├── electron/
│   ├── main/          — Electron main process (IPC handlers)
│   └── preload/       — contextBridge API exposed to renderer
├── src/               — React renderer (TypeScript)
│   ├── modules/       — Feature modules (dashboard, grammar, sql, programming…)
│   ├── lib/           — IPC client, types, utils
│   └── stores/        — Zustand state stores
├── resources/
│   └── content/       — Exercise YAML files + SQL schemas
└── electron-builder.config.ts
```
