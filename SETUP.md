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
- `github`, `supabase`, `vercel` — integrations
- `typescript-lsp`, `rust-analyzer-lsp` — language servers

## 4. Install Go toolchain (for building eks.exe)

```bash
# Go 1.21+
https://go.dev/dl/

# Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

## 5. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

## 6. Build the app

```bash
wails build
```

Binary output: `build/bin/eks.exe` (Windows) or `build/bin/eks` (Linux/Mac)

## 7. Run in dev mode

```bash
wails dev
```

## Runtime requirements

| Language | Required for |
|----------|-------------|
| Go 1.21+ | Building + running Go exercises |
| Node.js 18+ | TypeScript exercises |
| Python 3.10+ | Python exercises |
| Java 17+ | Java exercises |
| Rust (rustc) | Rust exercises |
| gcc/clang | C and C++ exercises |
