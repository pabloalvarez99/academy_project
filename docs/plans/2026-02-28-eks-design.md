# Engineering Knowledge System (EKS) — Architecture Design

**Date:** 2026-02-28
**Status:** Approved — Implementation Starting
**Author:** Claude Code (Senior Software Architect)

---

## Overview

EKS is a fully offline, standalone desktop application for professional technical learning. It provides:
- English Grammar Training (rule-based, no AI)
- Multi-language Programming Lab (Go, Rust, TypeScript, Python, Java, C, C++)
- SQL Laboratory
- IT Knowledge Base
- Multi-user profiles with progress tracking and achievements

---

## Technology Stack

| Concern            | Choice                          | Rationale |
|--------------------|--------------------------------|-----------|
| Language           | Go                             | Required |
| UI Framework       | Wails v2                       | Go + web frontend, single binary |
| Frontend           | React 18 + TypeScript + Vite   | Largest ecosystem, Monaco Editor |
| UI Components      | shadcn/ui + Tailwind CSS       | Accessible, composable |
| Code Editor        | Monaco Editor                  | VS Code engine, multi-language |
| State Management   | Zustand                        | Lightweight, no boilerplate |
| Database           | SQLite (modernc.org/sqlite)    | Pure Go, no CGO, proven |
| Full-text Search   | Bleve                          | Pure Go, embedded |
| Content Format     | Markdown + YAML via go:embed   | Git-friendly, fast loading |
| Code Sandbox       | OS-level process isolation     | Cross-platform, no external deps |

---

## Architecture: Monolith with Internal Package Modules

One Go binary with strict internal package boundaries. All modules communicate in-process via typed function calls. Wails bridges Go backend ↔ React frontend.

### Directory Structure

```
eks/
├── cmd/eks/main.go                # Wails entrypoint
├── internal/
│   ├── app/                       # Root app struct, Wails bindings registry
│   ├── db/                        # Database layer (all SQL)
│   │   └── migrations/            # Versioned SQL migration files
│   ├── user/                      # Profile management, bcrypt PIN auth
│   ├── content/                   # go:embed content loader + parser
│   ├── search/                    # Bleve FTS engine
│   ├── grammar/                   # English Grammar Training module
│   │   └── rules/                 # Rule implementations (articles, tenses, etc.)
│   ├── programming/               # Programming Lab module
│   ├── sandbox/                   # Code execution isolation (platform-specific)
│   ├── sql/                       # SQL Laboratory module
│   ├── knowledge/                 # IT Knowledge Base module
│   ├── progress/                  # Progress tracking + achievement engine
│   └── analytics/                 # Local event logging
├── frontend/
│   └── src/
│       ├── components/            # Shared UI components
│       ├── modules/               # grammar/, programming/, sql/, knowledge/
│       ├── stores/                # Zustand state stores
│       └── wailsjs/               # Auto-generated Go bindings
├── content/                       # go:embed content tree
│   ├── version.json
│   ├── grammar/
│   ├── programming/
│   ├── sql/
│   ├── knowledge/
│   └── docs/
├── runtimes/                      # Compressed language runtimes
└── scripts/                       # Build + runtime fetch scripts
```

---

## Database Schema

**File:** `~/.eks/data/users.db`
**Driver:** `modernc.org/sqlite` (pure Go, no CGO)

```sql
CREATE TABLE users (
  id           TEXT PRIMARY KEY,
  username     TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  pin_hash     TEXT,
  avatar       TEXT,
  created_at   INTEGER NOT NULL,
  last_active  INTEGER,
  settings     TEXT DEFAULT '{}'
);

CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module      TEXT NOT NULL,
  started_at  INTEGER NOT NULL,
  ended_at    INTEGER,
  duration_s  INTEGER
);

CREATE TABLE attempts (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id  TEXT NOT NULL,
  module       TEXT NOT NULL,
  language     TEXT,
  started_at   INTEGER NOT NULL,
  completed_at INTEGER,
  status       TEXT NOT NULL CHECK(status IN ('in_progress','passed','failed','skipped')),
  score        INTEGER,
  time_ms      INTEGER,
  memory_kb    INTEGER,
  code_input   TEXT,
  output       TEXT,
  error_msg    TEXT
);

CREATE TABLE progress (
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module       TEXT NOT NULL,
  category     TEXT NOT NULL,
  total        INTEGER DEFAULT 0,
  completed    INTEGER DEFAULT 0,
  passed       INTEGER DEFAULT 0,
  last_updated INTEGER NOT NULL,
  PRIMARY KEY (user_id, module, category)
);

CREATE TABLE achievements (
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  earned_at      INTEGER NOT NULL,
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE events (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  event_type   TEXT NOT NULL,
  payload      TEXT,
  occurred_at  INTEGER NOT NULL
);
```

---

## Code Execution Sandbox

### Strategy: OS-level process isolation

1. Extract compiler binaries to `~/.eks/runtimes/` on first run
2. Write source to isolated `temp/eks-exec-{uuid}/`
3. Compile with 30s timeout
4. Execute with 10s timeout, 128MB memory cap
5. Apply platform restrictions:
   - **Linux:** seccomp-bpf + PID namespace + no-new-privs
   - **Windows:** Job Objects (memory/CPU/process limits) + restricted token
   - **macOS:** sandbox-exec with custom .sb profile
6. Capture stdout/stderr, measure time/memory
7. Compare against expected output
8. Clean up temp dir

### Bundled Runtimes

| Language   | Runtime           | Size (compressed) |
|------------|-------------------|-------------------|
| Go         | Go toolchain      | ~120MB |
| Rust       | rustc + core      | ~350MB |
| TypeScript | Deno              | ~80MB  |
| Python     | CPython 3.12 min  | ~35MB  |
| Java       | Temurin JRE       | ~120MB |
| C          | TCC (Tiny C)      | ~400KB |
| C++        | musl-cross g++    | ~80MB  |

---

## Content System

### Exercise Format (YAML)
```yaml
id: go-basics-001
title: "Hello, World!"
difficulty: 1
tags: [basics, output, fmt]
description: |
  Write a program that prints: Hello, World!
starter_code: |
  package main
  func main() {
      // your code here
  }
test_cases:
  - input: ""
    expected_output: "Hello, World!\n"
    time_limit_ms: 5000
    memory_limit_kb: 65536
hints:
  - "Import the fmt package"
  - "Use fmt.Println()"
solution: |
  package main
  import "fmt"
  func main() { fmt.Println("Hello, World!") }
metadata:
  version: "1.0.0"
  content_version: 1
```

### Versioning
`content/version.json` contains per-module version + exercise counts. Checked at startup to detect content updates.

---

## Size Budget

| Component                  | Size |
|---------------------------|------|
| Go binary + Wails         | ~50MB |
| Frontend assets           | ~30MB |
| Language runtimes         | ~790MB |
| Content (YAML/MD)         | ~150MB |
| Offline docs              | ~500MB |
| Bleve index (first run)   | ~200MB |
| **Total installer**       | **~1.7GB** |
| **Total after first run** | **~2.8GB** |

---

## Packaging

- **Windows:** NSIS installer → `.exe`
- **macOS:** create-dmg → `.dmg`
- **Linux:** AppImage + `.deb` + `.rpm`
- **Build tool:** `wails build` + GoReleaser for cross-compilation

---

## Content Plan (Target)

| Module      | Category          | Target Count |
|-------------|-------------------|--------------|
| Grammar     | Rules + exercises | 500 exercises |
| Programming | 7 languages       | 1,200 exercises |
| SQL         | Query exercises   | 300 exercises |
| Knowledge   | 7 topic areas     | 800 articles |
| Docs        | Offline stdlib    | Full Go + SQL ref |
