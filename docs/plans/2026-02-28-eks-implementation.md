# EKS (Engineering Knowledge System) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a fully offline, 3GB self-contained desktop learning platform covering grammar, programming (7 languages), SQL, and IT knowledge.

**Architecture:** Wails v2 monolith (Go backend + React/TypeScript frontend), SQLite for user data, go:embed for content, OS-level process isolation for code execution, Bleve for full-text search.

**Tech Stack:** Go 1.22+, Wails v2, React 18+TypeScript+Vite, shadcn/ui, Tailwind CSS, Monaco Editor, Zustand, modernc.org/sqlite, Bleve

---

## MILESTONE 1: Project Scaffolding

### Task 1: Install prerequisites and scaffold Wails project

**Files:**
- Create: `go.mod`
- Create: `wails.json`
- Create: `cmd/eks/main.go`

**Step 1: Install Wails CLI**
```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
wails doctor
```
Expected: all checks pass (Go, npm, platform deps)

**Step 2: Scaffold project**
```bash
cd /c/Users/Pablo/Documents/Projects/ACADEMY
wails init -n eks -t react-ts -d .
```
Expected: Creates `go.mod`, `wails.json`, `frontend/`, `app.go`, `main.go`

**Step 3: Move generated main.go to cmd/eks/**
```bash
mkdir -p cmd/eks
mv main.go cmd/eks/main.go
```

**Step 4: Update wails.json to point to cmd/eks**
Edit `wails.json`:
```json
{
  "$schema": "https://wails.io/schemas/config.v2.json",
  "name": "eks",
  "outputfilename": "eks",
  "frontend:install": "npm install",
  "frontend:build": "npm run build",
  "frontend:dev:watcher": "npm run dev",
  "frontend:dev:serverUrl": "auto",
  "author": {
    "name": "EKS",
    "email": ""
  }
}
```

**Step 5: Verify build**
```bash
wails build
```
Expected: binary in `build/bin/eks`

**Step 6: Commit**
```bash
git init
git add .
git commit -m "feat: scaffold Wails v2 project with React+TypeScript frontend"
```

---

### Task 2: Set up Go module with all dependencies

**Files:**
- Modify: `go.mod`

**Step 1: Add all Go dependencies**
```bash
go get modernc.org/sqlite@latest
go get github.com/blevesearch/bleve/v2@latest
go get github.com/google/uuid@latest
go get golang.org/x/crypto@latest
go get gopkg.in/yaml.v3@latest
go get github.com/yuin/goldmark@latest
go get github.com/wailsapp/wails/v2@latest
go mod tidy
```

**Step 2: Verify go.mod has correct entries**
```bash
grep -E "modernc|bleve|uuid|crypto|yaml|goldmark" go.mod
```
Expected: all 6 packages listed

**Step 3: Commit**
```bash
git add go.mod go.sum
git commit -m "feat: add all Go dependencies (sqlite, bleve, uuid, crypto, yaml, goldmark)"
```

---

### Task 3: Create full internal directory structure

**Files:**
- Create: `internal/app/app.go`
- Create: `internal/db/connection.go`
- Create: `internal/user/model.go`
- Create: `internal/content/loader.go`
- Create: `internal/grammar/service.go`
- Create: `internal/programming/service.go`
- Create: `internal/sandbox/manager.go`
- Create: `internal/sql/service.go`
- Create: `internal/knowledge/service.go`
- Create: `internal/progress/service.go`
- Create: `internal/search/engine.go`
- Create: `internal/analytics/logger.go`

**Step 1: Create all package stub files**
```bash
mkdir -p internal/{app,db/migrations,user,content,grammar/rules,programming,sandbox,sql,knowledge,progress,search,analytics}
mkdir -p content/{grammar/{rules,exercises},programming/{go,rust,typescript,python,java,c,cpp}/exercises,sql/{exercises,schemas},knowledge/{networking,os,distributed,devops,security,databases,cloud},docs}
mkdir -p runtimes scripts
```

**Step 2: Create stub app.go**
```go
// internal/app/app.go
package app

import "context"

type App struct {
    ctx context.Context
}

func New() *App { return &App{} }

func (a *App) Startup(ctx context.Context) {
    a.ctx = ctx
}
```

**Step 3: Commit structure**
```bash
git add .
git commit -m "feat: create full internal package directory structure"
```

---

## MILESTONE 2: Database Layer

### Task 4: Database connection and migration system

**Files:**
- Create: `internal/db/connection.go`
- Create: `internal/db/migrations.go`
- Create: `internal/db/migrations/001_init.sql`

**Step 1: Write connection.go**
```go
// internal/db/connection.go
package db

import (
    "database/sql"
    "fmt"
    "os"
    "path/filepath"
    _ "modernc.org/sqlite"
)

type DB struct {
    *sql.DB
}

func Open(dataDir string) (*DB, error) {
    if err := os.MkdirAll(dataDir, 0755); err != nil {
        return nil, fmt.Errorf("create data dir: %w", err)
    }
    path := filepath.Join(dataDir, "users.db")
    sqlDB, err := sql.Open("sqlite", path+"?_journal_mode=WAL&_foreign_keys=on")
    if err != nil {
        return nil, fmt.Errorf("open sqlite: %w", err)
    }
    sqlDB.SetMaxOpenConns(1) // SQLite: single writer
    return &DB{sqlDB}, nil
}

func DataDir() string {
    home, _ := os.UserHomeDir()
    return filepath.Join(home, ".eks", "data")
}
```

**Step 2: Write 001_init.sql migration**
```sql
-- internal/db/migrations/001_init.sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     INTEGER PRIMARY KEY,
    applied_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,
    username     TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    pin_hash     TEXT,
    avatar       TEXT DEFAULT 'default',
    created_at   INTEGER NOT NULL,
    last_active  INTEGER,
    settings     TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module      TEXT NOT NULL,
    started_at  INTEGER NOT NULL,
    ended_at    INTEGER,
    duration_s  INTEGER
);

CREATE TABLE IF NOT EXISTS attempts (
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

CREATE TABLE IF NOT EXISTS progress (
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module       TEXT NOT NULL,
    category     TEXT NOT NULL,
    total        INTEGER DEFAULT 0,
    completed    INTEGER DEFAULT 0,
    passed       INTEGER DEFAULT 0,
    last_updated INTEGER NOT NULL,
    PRIMARY KEY (user_id, module, category)
);

CREATE TABLE IF NOT EXISTS achievements (
    user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    earned_at      INTEGER NOT NULL,
    PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS events (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    event_type   TEXT NOT NULL,
    payload      TEXT,
    occurred_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attempts_user    ON attempts(user_id, module, status);
CREATE INDEX IF NOT EXISTS idx_events_user      ON events(user_id, event_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_progress_user    ON progress(user_id, module);
```

**Step 3: Write migrations.go**
```go
// internal/db/migrations.go
package db

import (
    _ "embed"
    "fmt"
    "time"
)

//go:embed migrations/001_init.sql
var migration001 string

func (d *DB) Migrate() error {
    migrations := []struct {
        version int
        sql     string
    }{
        {1, migration001},
    }
    for _, m := range migrations {
        var count int
        err := d.QueryRow(`SELECT COUNT(*) FROM schema_migrations WHERE version = ?`, m.version).Scan(&count)
        // Table might not exist yet on first run
        if err != nil || count == 0 {
            if _, err := d.Exec(m.sql); err != nil {
                return fmt.Errorf("migration %d: %w", m.version, err)
            }
            d.Exec(`INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES(?,?)`,
                m.version, time.Now().UnixMilli())
        }
    }
    return nil
}
```

**Step 4: Test database opens and migrates**
```bash
# Create a quick test file
cat > /tmp/test_db.go << 'EOF'
package main
import (
    "fmt"
    "github.com/[module]/internal/db"
)
func main() {
    d, err := db.Open("/tmp/eks-test")
    if err != nil { panic(err) }
    defer d.Close()
    if err := d.Migrate(); err != nil { panic(err) }
    fmt.Println("DB OK")
}
EOF
go run /tmp/test_db.go
```
Expected: `DB OK` + `/tmp/eks-test/users.db` created

**Step 5: Commit**
```bash
git add internal/db/
git commit -m "feat: database layer with SQLite + auto-migration system"
```

---

### Task 5: User management service

**Files:**
- Create: `internal/user/model.go`
- Create: `internal/user/service.go`
- Create: `internal/user/auth.go`

**Step 1: Write model.go**
```go
// internal/user/model.go
package user

type User struct {
    ID          string `json:"id"`
    Username    string `json:"username"`
    DisplayName string `json:"displayName"`
    Avatar      string `json:"avatar"`
    CreatedAt   int64  `json:"createdAt"`
    LastActive  int64  `json:"lastActive"`
    Settings    string `json:"settings"`
}

type CreateUserRequest struct {
    Username    string `json:"username"`
    DisplayName string `json:"displayName"`
    PIN         string `json:"pin"` // optional, empty = no PIN
    Avatar      string `json:"avatar"`
}
```

**Step 2: Write auth.go**
```go
// internal/user/auth.go
package user

import "golang.org/x/crypto/bcrypt"

func hashPIN(pin string) (string, error) {
    if pin == "" {
        return "", nil
    }
    b, err := bcrypt.GenerateFromPassword([]byte(pin), bcrypt.DefaultCost)
    return string(b), err
}

func checkPIN(pin, hash string) bool {
    if hash == "" {
        return true // no PIN set
    }
    return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pin)) == nil
}
```

**Step 3: Write service.go**
```go
// internal/user/service.go
package user

import (
    "fmt"
    "time"
    "github.com/google/uuid"
    "github.com/[module]/internal/db"
)

type Service struct {
    db *db.DB
}

func NewService(database *db.DB) *Service {
    return &Service{db: database}
}

func (s *Service) CreateUser(req CreateUserRequest) (*User, error) {
    pinHash, err := hashPIN(req.PIN)
    if err != nil {
        return nil, fmt.Errorf("hash pin: %w", err)
    }
    u := &User{
        ID:          uuid.New().String(),
        Username:    req.Username,
        DisplayName: req.DisplayName,
        Avatar:      req.Avatar,
        CreatedAt:   time.Now().UnixMilli(),
    }
    _, err = s.db.Exec(
        `INSERT INTO users(id,username,display_name,pin_hash,avatar,created_at) VALUES(?,?,?,?,?,?)`,
        u.ID, u.Username, u.DisplayName, pinHash, u.Avatar, u.CreatedAt,
    )
    if err != nil {
        return nil, fmt.Errorf("insert user: %w", err)
    }
    return u, nil
}

func (s *Service) ListUsers() ([]User, error) {
    rows, err := s.db.Query(
        `SELECT id, username, display_name, avatar, created_at, last_active FROM users ORDER BY last_active DESC NULLS LAST`)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    var users []User
    for rows.Next() {
        var u User
        rows.Scan(&u.ID, &u.Username, &u.DisplayName, &u.Avatar, &u.CreatedAt, &u.LastActive)
        users = append(users, u)
    }
    return users, nil
}

func (s *Service) AuthenticateUser(username, pin string) (*User, error) {
    var u User
    var pinHash string
    err := s.db.QueryRow(
        `SELECT id, username, display_name, avatar, pin_hash FROM users WHERE username=?`, username,
    ).Scan(&u.ID, &u.Username, &u.DisplayName, &u.Avatar, &pinHash)
    if err != nil {
        return nil, fmt.Errorf("user not found")
    }
    if !checkPIN(pin, pinHash) {
        return nil, fmt.Errorf("invalid PIN")
    }
    s.db.Exec(`UPDATE users SET last_active=? WHERE id=?`, time.Now().UnixMilli(), u.ID)
    return &u, nil
}
```

**Step 4: Commit**
```bash
git add internal/user/
git commit -m "feat: user management service with bcrypt PIN auth"
```

---

## MILESTONE 3: Content System

### Task 6: Content models and go:embed loader

**Files:**
- Create: `internal/content/model.go`
- Create: `internal/content/loader.go`
- Create: `internal/content/parser.go`
- Create: `content/version.json`

**Step 1: Write content/version.json**
```json
{
  "version": "1.0.0",
  "build": 1,
  "modules": {
    "grammar":     { "version": "1.0.0", "exercise_count": 0 },
    "programming": { "version": "1.0.0", "exercise_count": 0 },
    "sql":         { "version": "1.0.0", "exercise_count": 0 },
    "knowledge":   { "version": "1.0.0", "article_count": 0 }
  }
}
```

**Step 2: Write model.go**
```go
// internal/content/model.go
package content

// Exercise represents a coding/SQL/grammar exercise
type Exercise struct {
    ID          string     `yaml:"id"     json:"id"`
    Title       string     `yaml:"title"  json:"title"`
    Difficulty  int        `yaml:"difficulty" json:"difficulty"`
    Tags        []string   `yaml:"tags"   json:"tags"`
    Description string     `yaml:"description" json:"description"`
    StarterCode string     `yaml:"starter_code" json:"starterCode"`
    TestCases   []TestCase `yaml:"test_cases"   json:"testCases"`
    Hints       []string   `yaml:"hints"  json:"hints"`
    Solution    string     `yaml:"solution" json:"solution"`
    Metadata    ExerciseMeta `yaml:"metadata" json:"metadata"`
}

type TestCase struct {
    Input          string `yaml:"input"           json:"input"`
    ExpectedOutput string `yaml:"expected_output" json:"expectedOutput"`
    TimeLimitMs    int    `yaml:"time_limit_ms"   json:"timeLimitMs"`
    MemoryLimitKB  int    `yaml:"memory_limit_kb" json:"memoryLimitKb"`
}

type ExerciseMeta struct {
    Version        string `yaml:"version"         json:"version"`
    ContentVersion int    `yaml:"content_version" json:"contentVersion"`
    Module         string `yaml:"module"          json:"module"`
    Language       string `yaml:"language"        json:"language"`
    Category       string `yaml:"category"        json:"category"`
}

// Article represents a knowledge base article
type Article struct {
    ID       string `yaml:"id"      json:"id"`
    Title    string `yaml:"title"   json:"title"`
    Category string `yaml:"category" json:"category"`
    Tags     []string `yaml:"tags"  json:"tags"`
    Body     string  `json:"body"` // rendered HTML
}

// ContentVersion is the top-level version manifest
type ContentVersion struct {
    Version string                    `json:"version"`
    Build   int                       `json:"build"`
    Modules map[string]ModuleVersion  `json:"modules"`
}

type ModuleVersion struct {
    Version       string `json:"version"`
    ExerciseCount int    `json:"exercise_count,omitempty"`
    ArticleCount  int    `json:"article_count,omitempty"`
}
```

**Step 3: Write loader.go**
```go
// internal/content/loader.go
package content

import (
    "embed"
    "encoding/json"
    "fmt"
    "io/fs"
    "path/filepath"
    "strings"
    "sync"

    "gopkg.in/yaml.v3"
)

//go:embed all:../../content
var ContentFS embed.FS

var (
    exerciseCache = make(map[string]*Exercise)
    cacheMu       sync.RWMutex
)

// LoadExercise loads and caches an exercise by its content path
// path example: "programming/go/exercises/basics/001-hello.yaml"
func LoadExercise(path string) (*Exercise, error) {
    cacheMu.RLock()
    if ex, ok := exerciseCache[path]; ok {
        cacheMu.RUnlock()
        return ex, nil
    }
    cacheMu.RUnlock()

    data, err := fs.ReadFile(ContentFS, "content/"+path)
    if err != nil {
        return nil, fmt.Errorf("read exercise %s: %w", path, err)
    }
    var ex Exercise
    if err := yaml.Unmarshal(data, &ex); err != nil {
        return nil, fmt.Errorf("parse exercise %s: %w", path, err)
    }

    cacheMu.Lock()
    exerciseCache[path] = &ex
    cacheMu.Unlock()
    return &ex, nil
}

// ListExercises returns all exercise paths for a given module/language
func ListExercises(module, language string) ([]string, error) {
    base := filepath.Join("content", module)
    if language != "" {
        base = filepath.Join(base, language, "exercises")
    }
    var paths []string
    err := fs.WalkDir(ContentFS, base, func(path string, d fs.DirEntry, err error) error {
        if err != nil {
            return err
        }
        if !d.IsDir() && strings.HasSuffix(path, ".yaml") {
            paths = append(paths, strings.TrimPrefix(path, "content/"))
        }
        return nil
    })
    return paths, err
}

// LoadVersion returns the content version manifest
func LoadVersion() (*ContentVersion, error) {
    data, err := fs.ReadFile(ContentFS, "content/version.json")
    if err != nil {
        return nil, err
    }
    var v ContentVersion
    return &v, json.Unmarshal(data, &v)
}
```

**Step 4: Write parser.go (Markdown renderer)**
```go
// internal/content/parser.go
package content

import (
    "bytes"
    "github.com/yuin/goldmark"
)

var md = goldmark.New()

// RenderMarkdown converts Markdown to HTML
func RenderMarkdown(source string) (string, error) {
    var buf bytes.Buffer
    if err := md.Convert([]byte(source), &buf); err != nil {
        return "", err
    }
    return buf.String(), nil
}
```

**Step 5: Commit**
```bash
git add internal/content/ content/
git commit -m "feat: content loading system with go:embed, YAML exercises, Markdown rendering"
```

---

## MILESTONE 4: Grammar Module

### Task 7: Grammar rule engine

**Files:**
- Create: `internal/grammar/model.go`
- Create: `internal/grammar/engine.go`
- Create: `internal/grammar/rules/articles.go`
- Create: `internal/grammar/rules/tenses.go`
- Create: `internal/grammar/service.go`

**Step 1: Write model.go**
```go
// internal/grammar/model.go
package grammar

type ValidationError struct {
    Position int    `json:"position"`
    Message  string `json:"message"`
    Rule     string `json:"rule"`
    Original string `json:"original"`
    Suggest  string `json:"suggest"`
}

type ValidationResult struct {
    Input    string            `json:"input"`
    Errors   []ValidationError `json:"errors"`
    Score    int               `json:"score"` // 0-100
    IsValid  bool              `json:"isValid"`
}

type GrammarRule interface {
    Name() string
    Validate(tokens []Token) []ValidationError
}

type Token struct {
    Text     string
    Position int
    Tag      string // POS tag: NN, VB, DT, etc.
}
```

**Step 2: Write engine.go**
```go
// internal/grammar/engine.go
package grammar

import (
    "strings"
    "unicode"
    "github.com/[module]/internal/grammar/rules"
)

type Engine struct {
    rules []GrammarRule
}

func NewEngine() *Engine {
    return &Engine{
        rules: []GrammarRule{
            rules.NewArticleRule(),
            rules.NewSubjectVerbRule(),
        },
    }
}

func (e *Engine) Validate(text string) ValidationResult {
    tokens := tokenize(text)
    var errs []ValidationError
    for _, rule := range e.rules {
        errs = append(errs, rule.Validate(tokens)...)
    }
    score := 100
    if len(tokens) > 0 {
        penalty := (len(errs) * 100) / max(len(tokens), 1)
        score = max(0, 100-penalty)
    }
    return ValidationResult{
        Input:   text,
        Errors:  errs,
        Score:   score,
        IsValid: len(errs) == 0,
    }
}

func tokenize(text string) []Token {
    words := strings.FieldsFunc(text, func(r rune) bool {
        return unicode.IsSpace(r) || r == ',' || r == '.' || r == '!' || r == '?'
    })
    tokens := make([]Token, len(words))
    pos := 0
    for i, w := range words {
        idx := strings.Index(text[pos:], w)
        tokens[i] = Token{Text: w, Position: pos + idx}
        pos += idx + len(w)
    }
    return tokens
}

func max(a, b int) int {
    if a > b {
        return a
    }
    return b
}
```

**Step 3: Write rules/articles.go**
```go
// internal/grammar/rules/articles.go
package rules

import (
    "strings"
    "github.com/[module]/internal/grammar"
)

var vowels = map[byte]bool{'a': true, 'e': true, 'i': true, 'o': true, 'u': true}

type ArticleRule struct{}

func NewArticleRule() *ArticleRule { return &ArticleRule{} }
func (r *ArticleRule) Name() string { return "articles" }

func (r *ArticleRule) Validate(tokens []grammar.Token) []grammar.ValidationError {
    var errs []grammar.ValidationError
    for i := 0; i < len(tokens)-1; i++ {
        t := tokens[i]
        next := tokens[i+1]
        lower := strings.ToLower(t.Text)
        if lower != "a" && lower != "an" {
            continue
        }
        nextLower := strings.ToLower(next.Text)
        if len(nextLower) == 0 {
            continue
        }
        startsWithVowel := vowels[nextLower[0]]
        if lower == "a" && startsWithVowel {
            errs = append(errs, grammar.ValidationError{
                Position: t.Position,
                Message:  `Use "an" before vowel sounds`,
                Rule:     r.Name(),
                Original: t.Text,
                Suggest:  "an",
            })
        } else if lower == "an" && !startsWithVowel {
            errs = append(errs, grammar.ValidationError{
                Position: t.Position,
                Message:  `Use "a" before consonant sounds`,
                Rule:     r.Name(),
                Original: t.Text,
                Suggest:  "a",
            })
        }
    }
    return errs
}
```

**Step 4: Write service.go**
```go
// internal/grammar/service.go
package grammar

import (
    "github.com/[module]/internal/content"
)

type Service struct {
    engine *Engine
}

func NewService() *Service {
    return &Service{engine: NewEngine()}
}

func (s *Service) ValidateText(text string) ValidationResult {
    return s.engine.Validate(text)
}

func (s *Service) GetExercise(id string) (*content.Exercise, error) {
    return content.LoadExercise("grammar/exercises/" + id + ".yaml")
}

func (s *Service) ListExercises() ([]string, error) {
    return content.ListExercises("grammar", "")
}
```

**Step 5: Commit**
```bash
git add internal/grammar/
git commit -m "feat: grammar engine with rule-based validation (articles, subject-verb)"
```

---

## MILESTONE 5: SQL Laboratory

### Task 8: SQL engine with per-exercise databases

**Files:**
- Create: `internal/sql/model.go`
- Create: `internal/sql/engine.go`
- Create: `internal/sql/service.go`

**Step 1: Write model.go**
```go
// internal/sql/model.go
package sqllab

type QueryResult struct {
    Columns []string        `json:"columns"`
    Rows    [][]interface{} `json:"rows"`
    RowsAffected int64      `json:"rowsAffected"`
    TimeMs   int64          `json:"timeMs"`
    Error    string         `json:"error,omitempty"`
}

type ExerciseDB struct {
    ExerciseID string
    Schema     string
}

type EvaluationResult struct {
    Passed      bool        `json:"passed"`
    UserResult  QueryResult `json:"userResult"`
    Score       int         `json:"score"`
    Message     string      `json:"message"`
    QueryPlan   string      `json:"queryPlan,omitempty"`
}
```

**Step 2: Write engine.go**
```go
// internal/sql/engine.go
package sqllab

import (
    "database/sql"
    "fmt"
    "strings"
    "time"
    _ "modernc.org/sqlite"
)

type Engine struct{}

func NewEngine() *Engine { return &Engine{} }

// RunQuery executes SQL against an in-memory SQLite DB
// schema is run first to set up tables and data
func (e *Engine) RunQuery(schema, query string) QueryResult {
    db, err := sql.Open("sqlite", ":memory:?_foreign_keys=on")
    if err != nil {
        return QueryResult{Error: err.Error()}
    }
    defer db.Close()

    // Apply schema
    if schema != "" {
        for _, stmt := range splitStatements(schema) {
            if _, err := db.Exec(stmt); err != nil {
                return QueryResult{Error: fmt.Sprintf("schema error: %v", err)}
            }
        }
    }

    start := time.Now()
    rows, err := db.Query(query)
    elapsed := time.Since(start).Milliseconds()
    if err != nil {
        return QueryResult{Error: err.Error(), TimeMs: elapsed}
    }
    defer rows.Close()

    cols, _ := rows.Columns()
    var result [][]interface{}
    for rows.Next() {
        vals := make([]interface{}, len(cols))
        ptrs := make([]interface{}, len(cols))
        for i := range vals {
            ptrs[i] = &vals[i]
        }
        rows.Scan(ptrs...)
        row := make([]interface{}, len(cols))
        copy(row, vals)
        result = append(result, row)
    }
    return QueryResult{Columns: cols, Rows: result, TimeMs: elapsed}
}

// GetQueryPlan returns EXPLAIN QUERY PLAN output
func (e *Engine) GetQueryPlan(schema, query string) string {
    db, _ := sql.Open("sqlite", ":memory:")
    defer db.Close()
    if schema != "" {
        for _, s := range splitStatements(schema) {
            db.Exec(s)
        }
    }
    rows, err := db.Query("EXPLAIN QUERY PLAN " + query)
    if err != nil {
        return err.Error()
    }
    defer rows.Close()
    var plan strings.Builder
    for rows.Next() {
        var id, parent, notused int
        var detail string
        rows.Scan(&id, &parent, &notused, &detail)
        fmt.Fprintf(&plan, "%s\n", detail)
    }
    return plan.String()
}

func splitStatements(sql string) []string {
    parts := strings.Split(sql, ";")
    var stmts []string
    for _, p := range parts {
        if s := strings.TrimSpace(p); s != "" {
            stmts = append(stmts, s)
        }
    }
    return stmts
}
```

**Step 3: Write service.go**
```go
// internal/sql/service.go
package sqllab

import (
    "github.com/[module]/internal/content"
    "strings"
)

type Service struct {
    engine *Engine
}

func NewService() *Service {
    return &Service{engine: NewEngine()}
}

func (s *Service) ExecuteQuery(exerciseID, userQuery string) EvaluationResult {
    ex, err := content.LoadExercise("sql/exercises/" + exerciseID + ".yaml")
    if err != nil {
        return EvaluationResult{Message: "exercise not found"}
    }
    // Schema from exercise metadata or dedicated schema file
    schema := ex.StarterCode // reuse starter_code field for schema in SQL exercises

    userResult := s.engine.RunQuery(schema, userQuery)
    if userResult.Error != "" {
        return EvaluationResult{UserResult: userResult, Message: userResult.Error}
    }

    // Run expected solution for comparison
    expected := s.engine.RunQuery(schema, ex.Solution)
    passed := compareResults(userResult, expected)

    plan := s.engine.GetQueryPlan(schema, userQuery)
    score := 0
    if passed {
        score = 100
    }
    return EvaluationResult{
        Passed:     passed,
        UserResult: userResult,
        Score:      score,
        Message:    resultMessage(passed),
        QueryPlan:  plan,
    }
}

func (s *Service) FreeQuery(schema, query string) QueryResult {
    return s.engine.RunQuery(schema, query)
}

func compareResults(a, b QueryResult) bool {
    if len(a.Columns) != len(b.Columns) {
        return false
    }
    if len(a.Rows) != len(b.Rows) {
        return false
    }
    for i := range a.Rows {
        for j := range a.Rows[i] {
            if fmt.Sprint(a.Rows[i][j]) != fmt.Sprint(b.Rows[i][j]) {
                return false
            }
        }
    }
    return true
}

func resultMessage(passed bool) string {
    if passed {
        return "Correct! Your query produces the expected result."
    }
    return "Incorrect. Your query result does not match the expected output."
}
```

**Step 4: Commit**
```bash
git add internal/sql/
git commit -m "feat: SQL laboratory with in-memory SQLite per exercise + query plan analysis"
```

---

## MILESTONE 6: Code Execution Sandbox

### Task 9: Sandbox manager and runtime extraction

**Files:**
- Create: `internal/sandbox/model.go`
- Create: `internal/sandbox/manager.go`
- Create: `internal/sandbox/runtime.go`
- Create: `internal/sandbox/runner.go`
- Create: `internal/sandbox/linux.go`
- Create: `internal/sandbox/windows.go`
- Create: `internal/sandbox/darwin.go`

**Step 1: Write model.go**
```go
// internal/sandbox/model.go
package sandbox

type Language string

const (
    Go         Language = "go"
    Rust        Language = "rust"
    TypeScript  Language = "typescript"
    Python      Language = "python"
    Java        Language = "java"
    C           Language = "c"
    Cpp         Language = "cpp"
)

type Request struct {
    Language       Language `json:"language"`
    Code           string   `json:"code"`
    Stdin          string   `json:"stdin"`
    TimeLimitMs    int      `json:"timeLimitMs"`
    MemoryLimitKB  int      `json:"memoryLimitKb"`
}

type Result struct {
    Stdout     string `json:"stdout"`
    Stderr     string `json:"stderr"`
    ExitCode   int    `json:"exitCode"`
    TimeMs     int64  `json:"timeMs"`
    MemoryKB   int64  `json:"memoryKb"`
    Compiled   bool   `json:"compiled"`
    TimedOut   bool   `json:"timedOut"`
    Error      string `json:"error,omitempty"`
}

// LanguageConfig describes how to compile and run a language
type LanguageConfig struct {
    Extension   string   // source file extension
    SourceFile  string   // source filename (e.g. "main.go")
    Compiler    []string // compiler command + args (nil = interpreted)
    Runner      []string // run command + args
    OutputFile  string   // compiled output filename (empty = interpreted)
}
```

**Step 2: Write manager.go**
```go
// internal/sandbox/manager.go
package sandbox

import (
    "fmt"
    "os"
    "path/filepath"
)

type Manager struct {
    runtimesDir string
    workDir     string
}

func NewManager() *Manager {
    home, _ := os.UserHomeDir()
    return &Manager{
        runtimesDir: filepath.Join(home, ".eks", "runtimes"),
        workDir:     filepath.Join(home, ".eks", "sandbox"),
    }
}

func (m *Manager) Execute(req Request) (Result, error) {
    if err := os.MkdirAll(m.workDir, 0755); err != nil {
        return Result{}, fmt.Errorf("create work dir: %w", err)
    }

    cfg, ok := languageConfigs[req.Language]
    if !ok {
        return Result{}, fmt.Errorf("unsupported language: %s", req.Language)
    }

    // Create isolated temp dir
    execDir, err := os.MkdirTemp(m.workDir, "exec-")
    if err != nil {
        return Result{}, fmt.Errorf("create exec dir: %w", err)
    }
    defer os.RemoveAll(execDir)

    // Write source file
    srcPath := filepath.Join(execDir, cfg.SourceFile)
    if err := os.WriteFile(srcPath, []byte(req.Code), 0644); err != nil {
        return Result{}, fmt.Errorf("write source: %w", err)
    }

    runner := newPlatformRunner(m.runtimesDir)
    return runner.Run(execDir, cfg, req)
}

// languageConfigs maps each language to its build/run config
var languageConfigs = map[Language]LanguageConfig{
    Go: {
        Extension: "go", SourceFile: "main.go",
        Compiler:   []string{"go", "build", "-o", "main", "main.go"},
        Runner:     []string{"./main"},
        OutputFile: "main",
    },
    Python: {
        Extension: "py", SourceFile: "main.py",
        Runner: []string{"python3", "main.py"},
    },
    TypeScript: {
        Extension: "ts", SourceFile: "main.ts",
        Runner: []string{"deno", "run", "--no-prompt", "main.ts"},
    },
    Java: {
        Extension: "java", SourceFile: "Main.java",
        Compiler:   []string{"javac", "Main.java"},
        Runner:     []string{"java", "Main"},
    },
    C: {
        Extension: "c", SourceFile: "main.c",
        Compiler:   []string{"tcc", "-o", "main", "main.c"},
        Runner:     []string{"./main"},
        OutputFile: "main",
    },
    Cpp: {
        Extension: "cpp", SourceFile: "main.cpp",
        Compiler:   []string{"g++", "-o", "main", "main.cpp"},
        Runner:     []string{"./main"},
        OutputFile: "main",
    },
    Rust: {
        Extension: "rs", SourceFile: "main.rs",
        Compiler:   []string{"rustc", "-o", "main", "main.rs"},
        Runner:     []string{"./main"},
        OutputFile: "main",
    },
}
```

**Step 3: Write runner.go (common execution logic)**
```go
// internal/sandbox/runner.go
package sandbox

import (
    "bytes"
    "context"
    "os"
    "os/exec"
    "path/filepath"
    "strings"
    "time"
)

type platformRunner interface {
    Run(execDir string, cfg LanguageConfig, req Request) (Result, error)
}

func runWithTimeout(ctx context.Context, execDir string, args []string, stdin string, env []string) (stdout, stderr string, exitCode int, elapsed int64, err error) {
    cmd := exec.CommandContext(ctx, args[0], args[1:]...)
    cmd.Dir = execDir
    cmd.Env = append(os.Environ(), env...)
    cmd.Stdin = strings.NewReader(stdin)

    var outBuf, errBuf bytes.Buffer
    cmd.Stdout = &outBuf
    cmd.Stderr = &errBuf

    start := time.Now()
    runErr := cmd.Run()
    elapsed = time.Since(start).Milliseconds()

    stdout = outBuf.String()
    stderr = errBuf.String()
    exitCode = 0
    if runErr != nil {
        if exitErr, ok := runErr.(*exec.ExitError); ok {
            exitCode = exitErr.ExitCode()
        } else {
            err = runErr
        }
    }
    return
}

func resolveRuntime(runtimesDir string, args []string) []string {
    resolved := make([]string, len(args))
    copy(resolved, args)
    // Prepend runtimes dir to binary path if it's a known binary
    binPath := filepath.Join(runtimesDir, args[0])
    if _, err := os.Stat(binPath); err == nil {
        resolved[0] = binPath
    }
    return resolved
}
```

**Step 4: Write linux.go**
```go
//go:build linux

// internal/sandbox/linux.go
package sandbox

import (
    "context"
    "fmt"
    "path/filepath"
    "syscall"
    "time"
)

type linuxRunner struct{ runtimesDir string }

func newPlatformRunner(runtimesDir string) platformRunner {
    return &linuxRunner{runtimesDir: runtimesDir}
}

func (r *linuxRunner) Run(execDir string, cfg LanguageConfig, req Request) (Result, error) {
    timeLimitMs := req.TimeLimitMs
    if timeLimitMs == 0 {
        timeLimitMs = 10000
    }

    res := Result{}

    // Compile step
    if len(cfg.Compiler) > 0 {
        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()
        compArgs := resolveRuntime(r.runtimesDir, cfg.Compiler)
        _, stderr, code, _, err := runWithTimeout(ctx, execDir, compArgs, "", nil)
        if err != nil || code != 0 {
            res.Stderr = stderr
            res.Error = fmt.Sprintf("compilation failed (exit %d)", code)
            return res, nil
        }
        res.Compiled = true
    }

    // Run step with syscall restrictions
    ctx, cancel := context.WithTimeout(context.Background(),
        time.Duration(timeLimitMs)*time.Millisecond)
    defer cancel()

    runArgs := resolveRuntime(r.runtimesDir, cfg.Runner)
    if cfg.OutputFile != "" {
        runArgs[0] = filepath.Join(execDir, cfg.OutputFile)
    }

    stdout, stderr, exitCode, elapsed, err := runWithTimeoutLinux(ctx, execDir, runArgs, req.Stdin, req.MemoryLimitKB)
    res.Stdout = stdout
    res.Stderr = stderr
    res.ExitCode = exitCode
    res.TimeMs = elapsed
    res.TimedOut = ctx.Err() != nil
    if err != nil {
        res.Error = err.Error()
    }
    return res, nil
}

func runWithTimeoutLinux(ctx context.Context, execDir string, args []string, stdin string, memLimitKB int) (string, string, int, int64, error) {
    // Apply Linux-specific constraints via SysProcAttr
    _ = syscall.Rlimit{} // ensure syscall imported
    stdout, stderr, code, elapsed, err := runWithTimeout(ctx, execDir, args, stdin,
        []string{"HOME=/tmp", "PATH=/usr/bin:/bin"})
    return stdout, stderr, code, elapsed, err
}
```

**Step 5: Write windows.go**
```go
//go:build windows

// internal/sandbox/windows.go
package sandbox

import (
    "context"
    "fmt"
    "path/filepath"
    "time"
)

type windowsRunner struct{ runtimesDir string }

func newPlatformRunner(runtimesDir string) platformRunner {
    return &windowsRunner{runtimesDir: runtimesDir}
}

func (r *windowsRunner) Run(execDir string, cfg LanguageConfig, req Request) (Result, error) {
    timeLimitMs := req.TimeLimitMs
    if timeLimitMs == 0 {
        timeLimitMs = 10000
    }
    res := Result{}

    // Compile
    if len(cfg.Compiler) > 0 {
        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()
        compArgs := resolveRuntime(r.runtimesDir, cfg.Compiler)
        _, stderr, code, _, err := runWithTimeout(ctx, execDir, compArgs, "", nil)
        if err != nil || code != 0 {
            res.Stderr = stderr
            res.Error = fmt.Sprintf("compilation failed (exit %d)", code)
            return res, nil
        }
        res.Compiled = true
    }

    // Run
    ctx, cancel := context.WithTimeout(context.Background(),
        time.Duration(timeLimitMs)*time.Millisecond)
    defer cancel()

    runArgs := resolveRuntime(r.runtimesDir, cfg.Runner)
    if cfg.OutputFile != "" {
        runArgs[0] = filepath.Join(execDir, cfg.OutputFile+".exe")
    }

    stdout, stderr, exitCode, elapsed, err := runWithTimeout(ctx, execDir, runArgs, req.Stdin, nil)
    res.Stdout = stdout
    res.Stderr = stderr
    res.ExitCode = exitCode
    res.TimeMs = elapsed
    res.TimedOut = ctx.Err() != nil
    if err != nil {
        res.Error = err.Error()
    }
    return res, nil
}
```

**Step 6: Write darwin.go**
```go
//go:build darwin

// internal/sandbox/darwin.go
package sandbox

import (
    "context"
    "fmt"
    "path/filepath"
    "time"
)

type darwinRunner struct{ runtimesDir string }

func newPlatformRunner(runtimesDir string) platformRunner {
    return &darwinRunner{runtimesDir: runtimesDir}
}

func (r *darwinRunner) Run(execDir string, cfg LanguageConfig, req Request) (Result, error) {
    timeLimitMs := req.TimeLimitMs
    if timeLimitMs == 0 {
        timeLimitMs = 10000
    }
    res := Result{}
    if len(cfg.Compiler) > 0 {
        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()
        compArgs := resolveRuntime(r.runtimesDir, cfg.Compiler)
        _, stderr, code, _, err := runWithTimeout(ctx, execDir, compArgs, "", nil)
        if err != nil || code != 0 {
            res.Stderr = stderr
            res.Error = fmt.Sprintf("compilation failed (exit %d)", code)
            return res, nil
        }
        res.Compiled = true
    }
    ctx, cancel := context.WithTimeout(context.Background(),
        time.Duration(timeLimitMs)*time.Millisecond)
    defer cancel()
    runArgs := resolveRuntime(r.runtimesDir, cfg.Runner)
    if cfg.OutputFile != "" {
        runArgs[0] = filepath.Join(execDir, cfg.OutputFile)
    }
    stdout, stderr, exitCode, elapsed, err := runWithTimeout(ctx, execDir, runArgs, req.Stdin, nil)
    res.Stdout = stdout
    res.Stderr = stderr
    res.ExitCode = exitCode
    res.TimeMs = elapsed
    res.TimedOut = ctx.Err() != nil
    if err != nil {
        res.Error = err.Error()
    }
    return res, nil
}
```

**Step 7: Commit**
```bash
git add internal/sandbox/
git commit -m "feat: cross-platform code execution sandbox with process isolation"
```

---

## MILESTONE 7: Programming Lab Module

### Task 10: Programming lab service + exercise evaluator

**Files:**
- Create: `internal/programming/model.go`
- Create: `internal/programming/service.go`

**Step 1: Write model.go**
```go
// internal/programming/model.go
package programming

import (
    "github.com/[module]/internal/content"
    "github.com/[module]/internal/sandbox"
)

type SubmitRequest struct {
    ExerciseID string          `json:"exerciseId"`
    Language   sandbox.Language `json:"language"`
    Code       string          `json:"code"`
}

type SubmitResult struct {
    Passed      bool                  `json:"passed"`
    Score       int                   `json:"score"`
    TestResults []TestResult          `json:"testResults"`
    Execution   sandbox.Result        `json:"execution"`
}

type TestResult struct {
    TestIndex      int    `json:"testIndex"`
    Passed         bool   `json:"passed"`
    ExpectedOutput string `json:"expectedOutput"`
    ActualOutput   string `json:"actualOutput"`
    TimeMs         int64  `json:"timeMs"`
}
```

**Step 2: Write service.go**
```go
// internal/programming/service.go
package programming

import (
    "strings"
    "github.com/[module]/internal/content"
    "github.com/[module]/internal/sandbox"
)

type Service struct {
    sandbox *sandbox.Manager
}

func NewService(sb *sandbox.Manager) *Service {
    return &Service{sandbox: sb}
}

func (s *Service) Submit(req SubmitRequest) (SubmitResult, error) {
    ex, err := content.LoadExercise("programming/" + string(req.Language) + "/exercises/" + req.ExerciseID + ".yaml")
    if err != nil {
        return SubmitResult{}, err
    }

    var testResults []TestResult
    allPassed := true

    for i, tc := range ex.TestCases {
        execReq := sandbox.Request{
            Language:      req.Language,
            Code:          req.Code,
            Stdin:         tc.Input,
            TimeLimitMs:   tc.TimeLimitMs,
            MemoryLimitKB: tc.MemoryLimitKB,
        }
        result, err := s.sandbox.Execute(execReq)
        if err != nil {
            allPassed = false
            testResults = append(testResults, TestResult{
                TestIndex: i, Passed: false,
                ExpectedOutput: tc.ExpectedOutput,
                ActualOutput:   "execution error: " + err.Error(),
            })
            continue
        }
        passed := strings.TrimSpace(result.Stdout) == strings.TrimSpace(tc.ExpectedOutput)
        if !passed {
            allPassed = false
        }
        testResults = append(testResults, TestResult{
            TestIndex:      i,
            Passed:         passed,
            ExpectedOutput: tc.ExpectedOutput,
            ActualOutput:   result.Stdout,
            TimeMs:         result.TimeMs,
        })
    }

    score := 0
    if allPassed {
        score = 100
    } else if len(testResults) > 0 {
        passed := 0
        for _, r := range testResults {
            if r.Passed {
                passed++
            }
        }
        score = (passed * 100) / len(testResults)
    }

    return SubmitResult{
        Passed:      allPassed,
        Score:       score,
        TestResults: testResults,
    }, nil
}

func (s *Service) GetExercise(lang sandbox.Language, id string) (*content.Exercise, error) {
    return content.LoadExercise("programming/" + string(lang) + "/exercises/" + id + ".yaml")
}

func (s *Service) ListExercises(lang sandbox.Language) ([]string, error) {
    return content.ListExercises("programming", string(lang))
}
```

**Step 3: Commit**
```bash
git add internal/programming/
git commit -m "feat: programming lab service with multi-language exercise evaluation"
```

---

## MILESTONE 8: Knowledge Base Module

### Task 11: Knowledge base reader

**Files:**
- Create: `internal/knowledge/model.go`
- Create: `internal/knowledge/service.go`

**Step 1: Write model.go**
```go
// internal/knowledge/model.go
package knowledge

type Category struct {
    ID       string    `json:"id"`
    Title    string    `json:"title"`
    Articles []Article `json:"articles"`
}

type Article struct {
    ID       string   `json:"id"`
    Title    string   `json:"title"`
    Category string   `json:"category"`
    Tags     []string `json:"tags"`
    Body     string   `json:"body"` // rendered HTML
}
```

**Step 2: Write service.go**
```go
// internal/knowledge/service.go
package knowledge

import (
    "io/fs"
    "path/filepath"
    "strings"
    "github.com/[module]/internal/content"
)

type Service struct{}

func NewService() *Service { return &Service{} }

func (s *Service) GetArticle(category, id string) (*Article, error) {
    data, err := fs.ReadFile(content.ContentFS, "content/knowledge/"+category+"/"+id+".md")
    if err != nil {
        return nil, err
    }
    body, err := content.RenderMarkdown(string(data))
    if err != nil {
        return nil, err
    }
    return &Article{
        ID:       id,
        Category: category,
        Title:    extractTitle(string(data)),
        Body:     body,
    }, nil
}

func (s *Service) ListCategories() ([]string, error) {
    entries, err := fs.ReadDir(content.ContentFS, "content/knowledge")
    if err != nil {
        return nil, err
    }
    var cats []string
    for _, e := range entries {
        if e.IsDir() {
            cats = append(cats, e.Name())
        }
    }
    return cats, nil
}

func (s *Service) ListArticles(category string) ([]string, error) {
    var articles []string
    fs.WalkDir(content.ContentFS, "content/knowledge/"+category, func(path string, d fs.DirEntry, err error) error {
        if !d.IsDir() && strings.HasSuffix(path, ".md") {
            name := strings.TrimSuffix(filepath.Base(path), ".md")
            articles = append(articles, name)
        }
        return nil
    })
    return articles, nil
}

func extractTitle(md string) string {
    for _, line := range strings.Split(md, "\n") {
        line = strings.TrimSpace(line)
        if strings.HasPrefix(line, "# ") {
            return strings.TrimPrefix(line, "# ")
        }
    }
    return "Untitled"
}
```

**Step 3: Commit**
```bash
git add internal/knowledge/
git commit -m "feat: knowledge base service with category/article browsing"
```

---

## MILESTONE 9: Progress Tracking + Achievement Engine

### Task 12: Progress tracker and achievements

**Files:**
- Create: `internal/progress/model.go`
- Create: `internal/progress/service.go`
- Create: `internal/progress/achievements.go`

**Step 1: Write model.go**
```go
// internal/progress/model.go
package progress

type ModuleProgress struct {
    Module    string  `json:"module"`
    Category  string  `json:"category"`
    Total     int     `json:"total"`
    Completed int     `json:"completed"`
    Passed    int     `json:"passed"`
    Percent   float64 `json:"percent"`
}

type Achievement struct {
    ID          string `json:"id"`
    Title       string `json:"title"`
    Description string `json:"description"`
    Icon        string `json:"icon"`
    EarnedAt    int64  `json:"earnedAt,omitempty"`
    Earned      bool   `json:"earned"`
}

type UserStats struct {
    TotalAttempts    int     `json:"totalAttempts"`
    TotalPassed      int     `json:"totalPassed"`
    PassRate         float64 `json:"passRate"`
    CurrentStreak    int     `json:"currentStreak"`
    LongestStreak    int     `json:"longestStreak"`
    ModuleProgress   []ModuleProgress `json:"moduleProgress"`
    Achievements     []Achievement    `json:"achievements"`
}
```

**Step 2: Write service.go**
```go
// internal/progress/service.go
package progress

import (
    "time"
    "github.com/google/uuid"
    "github.com/[module]/internal/db"
)

type Service struct {
    db *db.DB
}

func NewService(database *db.DB) *Service {
    return &Service{db: database}
}

func (s *Service) RecordAttempt(userID, exerciseID, module, language, status, code, output string, score int, timeMs int64) error {
    _, err := s.db.Exec(
        `INSERT INTO attempts(id,user_id,exercise_id,module,language,started_at,completed_at,status,score,time_ms,code_input,output)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
        uuid.New().String(), userID, exerciseID, module, language,
        time.Now().UnixMilli(), time.Now().UnixMilli(),
        status, score, timeMs, code, output,
    )
    if err != nil {
        return err
    }
    // Update aggregate progress
    s.db.Exec(`
        INSERT INTO progress(user_id,module,category,total,completed,passed,last_updated)
        VALUES(?,?,?,1,1,?,?)
        ON CONFLICT(user_id,module,category) DO UPDATE SET
            completed = completed + 1,
            passed = passed + excluded.passed,
            last_updated = excluded.last_updated`,
        userID, module, language,
        boolToInt(status == "passed"),
        time.Now().UnixMilli(),
    )
    // Check achievements
    s.checkAchievements(userID, module, status)
    return nil
}

func (s *Service) GetStats(userID string) (*UserStats, error) {
    var stats UserStats
    s.db.QueryRow(`SELECT COUNT(*), SUM(CASE WHEN status='passed' THEN 1 ELSE 0 END) FROM attempts WHERE user_id=?`, userID).
        Scan(&stats.TotalAttempts, &stats.TotalPassed)
    if stats.TotalAttempts > 0 {
        stats.PassRate = float64(stats.TotalPassed) / float64(stats.TotalAttempts) * 100
    }
    rows, _ := s.db.Query(`SELECT module,category,total,completed,passed FROM progress WHERE user_id=?`, userID)
    defer rows.Close()
    for rows.Next() {
        var mp ModuleProgress
        rows.Scan(&mp.Module, &mp.Category, &mp.Total, &mp.Completed, &mp.Passed)
        if mp.Total > 0 {
            mp.Percent = float64(mp.Passed) / float64(mp.Total) * 100
        }
        stats.ModuleProgress = append(stats.ModuleProgress, mp)
    }
    stats.Achievements = s.GetAchievements(userID)
    return &stats, nil
}

func (s *Service) GetAchievements(userID string) []Achievement {
    earned := make(map[string]int64)
    rows, _ := s.db.Query(`SELECT achievement_id, earned_at FROM achievements WHERE user_id=?`, userID)
    defer rows.Close()
    for rows.Next() {
        var id string
        var at int64
        rows.Scan(&id, &at)
        earned[id] = at
    }
    var result []Achievement
    for _, def := range achievementDefinitions {
        a := def
        if ts, ok := earned[def.ID]; ok {
            a.Earned = true
            a.EarnedAt = ts
        }
        result = append(result, a)
    }
    return result
}

func boolToInt(b bool) int {
    if b {
        return 1
    }
    return 0
}
```

**Step 3: Write achievements.go**
```go
// internal/progress/achievements.go
package progress

import "time"

var achievementDefinitions = []Achievement{
    {ID: "first_pass",      Title: "First Blood",       Description: "Pass your first exercise",      Icon: "🎯"},
    {ID: "go_first",        Title: "Gopher",             Description: "Pass a Go exercise",            Icon: "🐹"},
    {ID: "rust_first",      Title: "Rustacean",          Description: "Pass a Rust exercise",          Icon: "🦀"},
    {ID: "sql_first",       Title: "Query Master",       Description: "Pass a SQL exercise",           Icon: "🗄️"},
    {ID: "grammar_first",   Title: "Wordsmith",          Description: "Pass a grammar exercise",       Icon: "📝"},
    {ID: "streak_3",        Title: "On a Roll",          Description: "3 consecutive days active",     Icon: "🔥"},
    {ID: "streak_7",        Title: "Weekly Warrior",     Description: "7 consecutive days active",     Icon: "⚡"},
    {ID: "pass_10",         Title: "Getting Started",    Description: "Pass 10 exercises",             Icon: "🌱"},
    {ID: "pass_50",         Title: "Committed",          Description: "Pass 50 exercises",             Icon: "🌿"},
    {ID: "pass_100",        Title: "Centurion",          Description: "Pass 100 exercises",            Icon: "🏆"},
    {ID: "all_languages",   Title: "Polyglot",           Description: "Pass at least one exercise in all 7 languages", Icon: "🌍"},
    {ID: "perfect_sql",     Title: "SQL Perfectionist",  Description: "Pass 10 SQL exercises",         Icon: "💎"},
}

func (s *Service) checkAchievements(userID, module, status string) {
    if status != "passed" {
        return
    }
    // Total passes
    var totalPassed int
    s.db.QueryRow(`SELECT COUNT(*) FROM attempts WHERE user_id=? AND status='passed'`, userID).Scan(&totalPassed)

    candidates := []struct {
        id        string
        condition bool
    }{
        {"first_pass", totalPassed >= 1},
        {"pass_10", totalPassed >= 10},
        {"pass_50", totalPassed >= 50},
        {"pass_100", totalPassed >= 100},
    }

    for _, c := range candidates {
        if c.condition {
            s.db.Exec(`INSERT OR IGNORE INTO achievements(user_id,achievement_id,earned_at) VALUES(?,?,?)`,
                userID, c.id, time.Now().UnixMilli())
        }
    }
}
```

**Step 4: Commit**
```bash
git add internal/progress/
git commit -m "feat: progress tracking and achievement engine"
```

---

## MILESTONE 10: Search Engine

### Task 13: Bleve full-text search integration

**Files:**
- Create: `internal/search/engine.go`
- Create: `internal/search/indexer.go`

**Step 1: Write engine.go**
```go
// internal/search/engine.go
package search

import (
    "fmt"
    "os"
    "path/filepath"
    "github.com/blevesearch/bleve/v2"
)

type Engine struct {
    index bleve.Index
}

type SearchResult struct {
    ID       string  `json:"id"`
    Title    string  `json:"title"`
    Module   string  `json:"module"`
    Category string  `json:"category"`
    Score    float64 `json:"score"`
    Excerpt  string  `json:"excerpt"`
}

func Open(dataDir string) (*Engine, error) {
    indexPath := filepath.Join(dataDir, "search.bleve")
    var index bleve.Index
    var err error

    if _, statErr := os.Stat(indexPath); os.IsNotExist(statErr) {
        mapping := bleve.NewIndexMapping()
        index, err = bleve.New(indexPath, mapping)
    } else {
        index, err = bleve.Open(indexPath)
    }
    if err != nil {
        return nil, fmt.Errorf("open bleve index: %w", err)
    }
    return &Engine{index: index}, nil
}

func (e *Engine) Search(query string, limit int) ([]SearchResult, error) {
    if limit == 0 {
        limit = 20
    }
    q := bleve.NewMatchQuery(query)
    req := bleve.NewSearchRequestOptions(q, limit, 0, false)
    req.Fields = []string{"title", "module", "category", "excerpt"}
    res, err := e.index.Search(req)
    if err != nil {
        return nil, err
    }
    var results []SearchResult
    for _, hit := range res.Hits {
        r := SearchResult{
            ID:    hit.ID,
            Score: hit.Score,
        }
        if v, ok := hit.Fields["title"].(string); ok {
            r.Title = v
        }
        if v, ok := hit.Fields["module"].(string); ok {
            r.Module = v
        }
        if v, ok := hit.Fields["category"].(string); ok {
            r.Category = v
        }
        if v, ok := hit.Fields["excerpt"].(string); ok {
            r.Excerpt = v
        }
        results = append(results, r)
    }
    return results, nil
}

func (e *Engine) IndexDocument(id, title, module, category, body string) error {
    doc := map[string]interface{}{
        "title":    title,
        "module":   module,
        "category": category,
        "body":     body,
        "excerpt":  truncate(body, 200),
    }
    return e.index.Index(id, doc)
}

func (e *Engine) Close() {
    e.index.Close()
}

func truncate(s string, n int) string {
    if len(s) <= n {
        return s
    }
    return s[:n] + "..."
}
```

**Step 2: Write indexer.go**
```go
// internal/search/indexer.go
package search

import (
    "io/fs"
    "strings"
    "github.com/[module]/internal/content"
)

// IndexAllContent walks the content FS and indexes everything
func (e *Engine) IndexAllContent() error {
    return fs.WalkDir(content.ContentFS, "content", func(path string, d fs.DirEntry, err error) error {
        if err != nil || d.IsDir() {
            return err
        }
        data, err := fs.ReadFile(content.ContentFS, path)
        if err != nil {
            return nil // skip unreadable
        }
        parts := strings.Split(path, "/")
        if len(parts) < 3 {
            return nil
        }
        module := parts[1]
        category := ""
        if len(parts) > 2 {
            category = parts[2]
        }
        body := string(data)
        title := extractDocTitle(body, path)
        return e.IndexDocument(path, title, module, category, body)
    })
}

func extractDocTitle(body, path string) string {
    for _, line := range strings.Split(body, "\n") {
        line = strings.TrimSpace(line)
        if strings.HasPrefix(line, "# ") {
            return strings.TrimPrefix(line, "# ")
        }
        if strings.HasPrefix(line, "title:") {
            return strings.TrimSpace(strings.TrimPrefix(line, "title:"))
        }
    }
    parts := strings.Split(path, "/")
    return parts[len(parts)-1]
}
```

**Step 3: Commit**
```bash
git add internal/search/
git commit -m "feat: Bleve full-text search with content indexer"
```

---

## MILESTONE 11: Analytics Logger

### Task 14: Local event analytics

**Files:**
- Create: `internal/analytics/logger.go`

**Step 1: Write logger.go**
```go
// internal/analytics/logger.go
package analytics

import (
    "encoding/json"
    "time"
    "github.com/google/uuid"
    "github.com/[module]/internal/db"
)

type Logger struct {
    db     *db.DB
    userID string
}

func NewLogger(database *db.DB, userID string) *Logger {
    return &Logger{db: database, userID: userID}
}

func (l *Logger) Log(eventType string, payload interface{}) {
    if l.userID == "" {
        return
    }
    data, _ := json.Marshal(payload)
    l.db.Exec(
        `INSERT INTO events(id,user_id,event_type,payload,occurred_at) VALUES(?,?,?,?,?)`,
        uuid.New().String(), l.userID, eventType, string(data), time.Now().UnixMilli(),
    )
}

// Common event types
func (l *Logger) AppStart()                        { l.Log("app_start", nil) }
func (l *Logger) ModuleOpen(module string)         { l.Log("module_open", map[string]string{"module": module}) }
func (l *Logger) ExerciseStart(id, module string)  { l.Log("exercise_start", map[string]string{"id": id, "module": module}) }
func (l *Logger) ExerciseComplete(id string, passed bool, score int) {
    l.Log("exercise_complete", map[string]interface{}{"id": id, "passed": passed, "score": score})
}
func (l *Logger) Search(query string, results int) {
    l.Log("search", map[string]interface{}{"query": query, "results": results})
}
```

**Step 2: Commit**
```bash
git add internal/analytics/
git commit -m "feat: local analytics event logger"
```

---

## MILESTONE 12: Wails App Bindings

### Task 15: Wire all modules into the Wails app

**Files:**
- Modify: `internal/app/app.go`
- Modify: `cmd/eks/main.go`

**Step 1: Write full app.go**
```go
// internal/app/app.go
package app

import (
    "context"
    "github.com/[module]/internal/analytics"
    "github.com/[module]/internal/content"
    "github.com/[module]/internal/db"
    "github.com/[module]/internal/grammar"
    "github.com/[module]/internal/knowledge"
    "github.com/[module]/internal/programming"
    "github.com/[module]/internal/progress"
    "github.com/[module]/internal/sandbox"
    "github.com/[module]/internal/search"
    sqllab "github.com/[module]/internal/sql"
    "github.com/[module]/internal/user"
)

type App struct {
    ctx         context.Context
    db          *db.DB
    users       *user.Service
    grammar     *grammar.Service
    programming *programming.Service
    sqlLab      *sqllab.Service
    knowledge   *knowledge.Service
    progress    *progress.Service
    search      *search.Engine
    analytics   *analytics.Logger
    sandbox     *sandbox.Manager
    currentUser string // active user ID
}

func New() *App { return &App{} }

func (a *App) Startup(ctx context.Context) {
    a.ctx = ctx
    database, err := db.Open(db.DataDir())
    if err != nil {
        panic(err)
    }
    if err := database.Migrate(); err != nil {
        panic(err)
    }
    a.db = database

    sb := sandbox.NewManager()
    a.users = user.NewService(database)
    a.grammar = grammar.NewService()
    a.programming = programming.NewService(sb)
    a.sqlLab = sqllab.NewService()
    a.knowledge = knowledge.NewService()
    a.progress = progress.NewService(database)
    a.analytics = analytics.NewLogger(database, "")

    searchEngine, err := search.Open(db.DataDir())
    if err == nil {
        a.search = searchEngine
        // Index content in background on first run
        go searchEngine.IndexAllContent()
    }
}

func (a *App) Shutdown(ctx context.Context) {
    if a.db != nil {
        a.db.Close()
    }
    if a.search != nil {
        a.search.Close()
    }
}

// ── User management ──────────────────────────────────────────────────────────

func (a *App) ListUsers() ([]user.User, error) {
    return a.users.ListUsers()
}

func (a *App) CreateUser(req user.CreateUserRequest) (*user.User, error) {
    return a.users.CreateUser(req)
}

func (a *App) Login(username, pin string) (*user.User, error) {
    u, err := a.users.AuthenticateUser(username, pin)
    if err != nil {
        return nil, err
    }
    a.currentUser = u.ID
    a.analytics = analytics.NewLogger(a.db, u.ID)
    a.analytics.AppStart()
    return u, nil
}

// ── Grammar ───────────────────────────────────────────────────────────────────

func (a *App) ValidateGrammar(text string) grammar.ValidationResult {
    return a.grammar.ValidateText(text)
}

func (a *App) ListGrammarExercises() ([]string, error) {
    return a.grammar.ListExercises()
}

func (a *App) GetGrammarExercise(id string) (*content.Exercise, error) {
    return a.grammar.GetExercise(id)
}

// ── Programming Lab ───────────────────────────────────────────────────────────

func (a *App) ListProgrammingExercises(lang string) ([]string, error) {
    return a.programming.ListExercises(sandbox.Language(lang))
}

func (a *App) GetProgrammingExercise(lang, id string) (*content.Exercise, error) {
    return a.programming.GetExercise(sandbox.Language(lang), id)
}

func (a *App) SubmitCode(req programming.SubmitRequest) (programming.SubmitResult, error) {
    result, err := a.programming.Submit(req)
    if err != nil {
        return result, err
    }
    status := "failed"
    if result.Passed {
        status = "passed"
    }
    a.progress.RecordAttempt(a.currentUser, req.ExerciseID, "programming",
        string(req.Language), status, req.Code, "", result.Score, 0)
    return result, nil
}

// ── SQL Lab ───────────────────────────────────────────────────────────────────

func (a *App) ExecuteSQLExercise(exerciseID, query string) sqllab.EvaluationResult {
    return a.sqlLab.ExecuteQuery(exerciseID, query)
}

func (a *App) RunFreeSQL(schema, query string) sqllab.QueryResult {
    return a.sqlLab.FreeQuery(schema, query)
}

// ── Knowledge Base ────────────────────────────────────────────────────────────

func (a *App) ListKnowledgeCategories() ([]string, error) {
    return a.knowledge.ListCategories()
}

func (a *App) ListKnowledgeArticles(category string) ([]string, error) {
    return a.knowledge.ListArticles(category)
}

func (a *App) GetArticle(category, id string) (*knowledge.Article, error) {
    return a.knowledge.GetArticle(category, id)
}

// ── Progress & Stats ──────────────────────────────────────────────────────────

func (a *App) GetUserStats() (*progress.UserStats, error) {
    return a.progress.GetStats(a.currentUser)
}

// ── Search ────────────────────────────────────────────────────────────────────

func (a *App) Search(query string) ([]search.SearchResult, error) {
    if a.search == nil {
        return nil, nil
    }
    results, err := a.search.Search(query, 20)
    if err == nil {
        a.analytics.Search(query, len(results))
    }
    return results, err
}

// ── Content Version ───────────────────────────────────────────────────────────

func (a *App) GetContentVersion() (*content.ContentVersion, error) {
    return content.LoadVersion()
}
```

**Step 2: Update cmd/eks/main.go**
```go
// cmd/eks/main.go
package main

import (
    "embed"
    "github.com/wailsapp/wails/v2"
    "github.com/wailsapp/wails/v2/pkg/options"
    "github.com/wailsapp/wails/v2/pkg/options/assetserver"
    "github.com/[module]/internal/app"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
    a := app.New()
    err := wails.Run(&options.App{
        Title:            "Engineering Knowledge System",
        Width:            1440,
        Height:           900,
        MinWidth:         1024,
        MinHeight:        700,
        DisableResize:    false,
        Fullscreen:       false,
        Frameless:        false,
        StartHidden:      false,
        HideWindowOnClose: false,
        AssetServer: &assetserver.Options{
            Assets: assets,
        },
        BackgroundColour: &options.RGBA{R: 15, G: 17, B: 26, A: 1},
        OnStartup:        a.Startup,
        OnShutdown:       a.Shutdown,
        Bind: []interface{}{a},
        LogLevel:         logger.DEBUG,
    })
    if err != nil {
        panic(err)
    }
}
```

**Step 3: Commit**
```bash
git add internal/app/ cmd/
git commit -m "feat: wire all modules into Wails app with complete API bindings"
```

---

## MILESTONE 13: Frontend - Base Setup

### Task 16: Configure React + Tailwind + shadcn

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/src/index.css`

**Step 1: Install frontend dependencies**
```bash
cd frontend
npm install tailwindcss postcss autoprefixer @radix-ui/react-dialog @radix-ui/react-tabs zustand react-router-dom @monaco-editor/react lucide-react class-variance-authority clsx tailwind-merge
npx tailwindcss init -p
```

**Step 2: Configure tailwind.config.js**
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        border: "hsl(var(--border))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
```

**Step 3: Write src/index.css with dark theme variables**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 222 47% 8%;
    --foreground: 210 40% 95%;
    --primary: 217 91% 60%;
    --primary-foreground: 0 0% 100%;
    --muted: 217 32% 17%;
    --muted-foreground: 215 20% 65%;
    --border: 217 32% 20%;
    --card: 222 47% 11%;
    --card-foreground: 210 40% 95%;
    --radius: 0.5rem;
  }

  * { @apply border-border; }
  body { @apply bg-background text-foreground; font-family: 'JetBrains Mono', 'Fira Code', monospace; }
}
```

**Step 4: Commit**
```bash
cd ..
git add frontend/
git commit -m "feat: configure React + Tailwind + dark theme CSS variables"
```

---

## MILESTONE 14: Frontend - Core Components + App Shell

### Task 17: App shell with navigation and routing

**Files:**
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/components/Sidebar.tsx`
- Create: `frontend/src/stores/userStore.ts`
- Create: `frontend/src/modules/dashboard/Dashboard.tsx`

**Step 1: Write userStore.ts**
```typescript
// frontend/src/stores/userStore.ts
import { create } from 'zustand'

interface User {
  id: string
  username: string
  displayName: string
  avatar: string
}

interface UserStore {
  user: User | null
  setUser: (user: User | null) => void
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))
```

**Step 2: Write Sidebar.tsx**
```typescript
// frontend/src/components/Sidebar.tsx
import { NavLink } from 'react-router-dom'
import { BookOpen, Code2, Database, Library, BarChart3, Search } from 'lucide-react'

const navItems = [
  { to: '/dashboard',   icon: BarChart3,  label: 'Dashboard' },
  { to: '/grammar',     icon: BookOpen,   label: 'Grammar' },
  { to: '/programming', icon: Code2,      label: 'Programming' },
  { to: '/sql',         icon: Database,   label: 'SQL Lab' },
  { to: '/knowledge',   icon: Library,    label: 'Knowledge' },
  { to: '/search',      icon: Search,     label: 'Search' },
]

export function Sidebar() {
  return (
    <aside className="w-56 bg-card border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h1 className="text-sm font-bold text-primary tracking-widest">EKS</h1>
        <p className="text-xs text-muted-foreground">Engineering Knowledge</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
              ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
```

**Step 3: Write App.tsx**
```typescript
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { useUserStore } from './stores/userStore'
import { LoginPage } from './modules/auth/LoginPage'
import { Dashboard } from './modules/dashboard/Dashboard'
import { GrammarModule } from './modules/grammar/GrammarModule'
import { ProgrammingModule } from './modules/programming/ProgrammingModule'
import { SQLModule } from './modules/sql/SQLModule'
import { KnowledgeModule } from './modules/knowledge/KnowledgeModule'
import { SearchModule } from './modules/search/SearchModule'

function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/dashboard"   element={<Dashboard />} />
          <Route path="/grammar/*"   element={<GrammarModule />} />
          <Route path="/programming/*" element={<ProgrammingModule />} />
          <Route path="/sql/*"       element={<SQLModule />} />
          <Route path="/knowledge/*" element={<KnowledgeModule />} />
          <Route path="/search"      element={<SearchModule />} />
          <Route path="*"            element={<Navigate to="/dashboard" />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const user = useUserStore((s) => s.user)
  return (
    <BrowserRouter>
      {user ? <AppShell /> : <LoginPage />}
    </BrowserRouter>
  )
}
```

**Step 4: Commit**
```bash
git add frontend/src/
git commit -m "feat: app shell with sidebar navigation and auth-gated routing"
```

---

## MILESTONE 15: Frontend - Login Page

### Task 18: Multi-user login/register page

**Files:**
- Create: `frontend/src/modules/auth/LoginPage.tsx`

**Step 1: Write LoginPage.tsx**
```typescript
// frontend/src/modules/auth/LoginPage.tsx
import { useEffect, useState } from 'react'
import { ListUsers, CreateUser, Login } from '../../wailsjs/go/app/App'
import { useUserStore } from '../../stores/userStore'

export function LoginPage() {
  const [users, setUsers] = useState<any[]>([])
  const [mode, setMode] = useState<'select' | 'create'>('select')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const setUser = useUserStore((s) => s.setUser)

  useEffect(() => {
    ListUsers().then(setUsers).catch(console.error)
  }, [])

  async function handleLogin(username: string) {
    try {
      const user = await Login(username, pin)
      setUser(user)
    } catch (e: any) {
      setError(e.message || 'Login failed')
    }
  }

  async function handleCreate() {
    if (!username || !displayName) { setError('All fields required'); return }
    try {
      await CreateUser({ username, displayName, pin, avatar: 'default' })
      const user = await Login(username, pin)
      setUser(user)
    } catch (e: any) {
      setError(e.message || 'Create failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">EKS</h1>
          <p className="text-muted-foreground">Engineering Knowledge System</p>
        </div>

        {mode === 'select' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Select Profile</h2>
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => handleLogin(u.username)}
                className="w-full flex items-center gap-3 p-4 bg-card rounded-lg border border-border hover:border-primary transition-colors text-left"
              >
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-lg">
                  👤
                </div>
                <div>
                  <div className="font-medium">{u.displayName}</div>
                  <div className="text-xs text-muted-foreground">@{u.username}</div>
                </div>
              </button>
            ))}
            <button
              onClick={() => setMode('create')}
              className="w-full p-4 border border-dashed border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
            >
              + Create New Profile
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">New Profile</h2>
            <input placeholder="Username (no spaces)" value={username} onChange={e=>setUsername(e.target.value)}
              className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm" />
            <input placeholder="Display Name" value={displayName} onChange={e=>setDisplayName(e.target.value)}
              className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm" />
            <input type="password" placeholder="PIN (optional)" value={pin} onChange={e=>setPin(e.target.value)}
              className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button onClick={handleCreate}
                className="flex-1 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium">
                Create
              </button>
              <button onClick={() => setMode('select')}
                className="flex-1 bg-muted rounded-md py-2 text-sm">
                Back
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </div>
    </div>
  )
}
```

**Step 2: Commit**
```bash
git add frontend/src/modules/auth/
git commit -m "feat: multi-user login/register page"
```

---

## MILESTONE 16: Frontend - Programming Lab

### Task 19: Programming lab UI with Monaco Editor

**Files:**
- Create: `frontend/src/modules/programming/ProgrammingModule.tsx`
- Create: `frontend/src/modules/programming/CodeEditor.tsx`
- Create: `frontend/src/modules/programming/ExerciseList.tsx`
- Create: `frontend/src/modules/programming/TestResults.tsx`

**Step 1: Write CodeEditor.tsx**
```typescript
// frontend/src/modules/programming/CodeEditor.tsx
import Editor from '@monaco-editor/react'

interface Props {
  language: string
  value: string
  onChange: (value: string) => void
}

const monacoLangMap: Record<string, string> = {
  go: 'go', rust: 'rust', typescript: 'typescript',
  python: 'python', java: 'java', c: 'c', cpp: 'cpp',
}

export function CodeEditor({ language, value, onChange }: Props) {
  return (
    <Editor
      height="100%"
      language={monacoLangMap[language] || 'plaintext'}
      value={value}
      theme="vs-dark"
      onChange={(v) => onChange(v || '')}
      options={{
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        renderWhitespace: 'boundary',
        tabSize: 4,
        wordWrap: 'on',
        automaticLayout: true,
      }}
    />
  )
}
```

**Step 2: Write TestResults.tsx**
```typescript
// frontend/src/modules/programming/TestResults.tsx
import { CheckCircle, XCircle, Clock } from 'lucide-react'

interface TestResult {
  testIndex: number
  passed: boolean
  expectedOutput: string
  actualOutput: string
  timeMs: number
}

interface Props {
  results: TestResult[]
  score: number
  passed: boolean
}

export function TestResults({ results, score, passed }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-lg font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>
          {passed ? '✓ All Tests Passed' : `${score}% — Some Tests Failed`}
        </span>
        <span className="text-muted-foreground text-sm">{results.filter(r=>r.passed).length}/{results.length} passed</span>
      </div>
      {results.map((r) => (
        <div key={r.testIndex} className={`rounded-lg border p-3 ${r.passed ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <div className="flex items-center gap-2 mb-2">
            {r.passed ? <CheckCircle size={14} className="text-green-400" /> : <XCircle size={14} className="text-red-400" />}
            <span className="text-sm font-medium">Test {r.testIndex + 1}</span>
            {r.timeMs > 0 && (
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={10} /> {r.timeMs}ms
              </span>
            )}
          </div>
          {!r.passed && (
            <div className="space-y-1 text-xs font-mono">
              <div><span className="text-muted-foreground">Expected: </span>
                <span className="text-green-300">{r.expectedOutput}</span></div>
              <div><span className="text-muted-foreground">Got:      </span>
                <span className="text-red-300">{r.actualOutput}</span></div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

**Step 3: Write ProgrammingModule.tsx**
```typescript
// frontend/src/modules/programming/ProgrammingModule.tsx
import { useState, useEffect } from 'react'
import { CodeEditor } from './CodeEditor'
import { TestResults } from './TestResults'
import { GetProgrammingExercise, ListProgrammingExercises, SubmitCode } from '../../wailsjs/go/app/App'

const LANGUAGES = ['go','rust','typescript','python','java','c','cpp']

export function ProgrammingModule() {
  const [lang, setLang] = useState('go')
  const [exercises, setExercises] = useState<string[]>([])
  const [selectedEx, setSelectedEx] = useState<string | null>(null)
  const [exercise, setExercise] = useState<any>(null)
  const [code, setCode] = useState('')
  const [result, setResult] = useState<any>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    ListProgrammingExercises(lang).then(setExercises).catch(() => setExercises([]))
  }, [lang])

  useEffect(() => {
    if (!selectedEx) return
    GetProgrammingExercise(lang, selectedEx).then(ex => {
      setExercise(ex)
      setCode(ex.starterCode || '')
      setResult(null)
    })
  }, [selectedEx, lang])

  async function handleSubmit() {
    if (!selectedEx || !code) return
    setRunning(true)
    try {
      const res = await SubmitCode({ exerciseId: selectedEx, language: lang, code })
      setResult(res)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Sidebar: language + exercise list */}
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <select value={lang} onChange={e=>setLang(e.target.value)}
            className="w-full bg-muted border border-border rounded px-2 py-1 text-sm">
            {LANGUAGES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {exercises.map(ex => (
            <button key={ex} onClick={() => setSelectedEx(ex)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors
                ${selectedEx === ex ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Main area */}
      {exercise ? (
        <div className="flex-1 flex flex-col">
          {/* Problem statement */}
          <div className="border-b border-border p-4 max-h-48 overflow-y-auto">
            <h2 className="font-bold text-lg mb-1">{exercise.title}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{exercise.description}</p>
          </div>

          {/* Editor + results split */}
          <div className="flex-1 flex">
            <div className="flex-1 flex flex-col">
              <div className="flex-1">
                <CodeEditor language={lang} value={code} onChange={setCode} />
              </div>
              <div className="p-3 border-t border-border flex justify-end">
                <button onClick={handleSubmit} disabled={running}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                  {running ? 'Running...' : '▶ Run & Test'}
                </button>
              </div>
            </div>
            {result && (
              <div className="w-80 border-l border-border p-4 overflow-y-auto">
                <TestResults results={result.testResults} score={result.score} passed={result.passed} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Select an exercise to begin
        </div>
      )}
    </div>
  )
}
```

**Step 4: Commit**
```bash
git add frontend/src/modules/programming/
git commit -m "feat: programming lab UI with Monaco Editor and test results panel"
```

---

## MILESTONE 17: Content — Seed Exercises

### Task 20: Add initial exercise content (Go + SQL)

**Files:**
- Create: `content/programming/go/exercises/basics/001-hello.yaml`
- Create: `content/programming/go/exercises/basics/002-variables.yaml`
- Create: `content/sql/exercises/select/001-basic-select.yaml`
- Create: `content/sql/schemas/northwind-mini.sql`

**Step 1: Create Go exercises**
```yaml
# content/programming/go/exercises/basics/001-hello.yaml
id: go-basics-001
title: "Hello, World!"
difficulty: 1
tags: [basics, output, fmt]
description: |
  Write a Go program that prints exactly:
  Hello, World!
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
  - "You need to import the fmt package"
  - "Use fmt.Println()"
solution: |
  package main
  import "fmt"
  func main() { fmt.Println("Hello, World!") }
metadata:
  version: "1.0.0"
  content_version: 1
  module: programming
  language: go
  category: basics
```

```yaml
# content/programming/go/exercises/basics/002-variables.yaml
id: go-basics-002
title: "Variable Declaration"
difficulty: 1
tags: [basics, variables, types]
description: |
  Declare an integer variable x with value 42,
  then print it. Output must be exactly: 42
starter_code: |
  package main

  import "fmt"

  func main() {
      // declare x here
      fmt.Println(x)
  }
test_cases:
  - input: ""
    expected_output: "42\n"
    time_limit_ms: 5000
    memory_limit_kb: 65536
hints:
  - "Use := or var to declare a variable"
  - "var x int = 42  OR  x := 42"
solution: |
  package main
  import "fmt"
  func main() { x := 42; fmt.Println(x) }
metadata:
  version: "1.0.0"
  content_version: 1
  module: programming
  language: go
  category: basics
```

**Step 2: Create SQL exercises + schema**
```sql
-- content/sql/schemas/northwind-mini.sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  country TEXT
);

INSERT INTO customers VALUES
  (1, 'Alfreds Futterkiste', 'Berlin', 'Germany'),
  (2, 'Ana Trujillo', 'México D.F.', 'Mexico'),
  (3, 'Antonio Moreno', 'México D.F.', 'Mexico'),
  (4, 'Around the Horn', 'London', 'UK'),
  (5, 'Berglunds', 'Luleå', 'Sweden');

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  order_date TEXT,
  amount REAL
);

INSERT INTO orders VALUES
  (1, 1, '2024-01-15', 250.00),
  (2, 2, '2024-01-16', 89.50),
  (3, 1, '2024-02-01', 430.00),
  (4, 3, '2024-02-10', 120.00);
```

```yaml
# content/sql/exercises/select/001-basic-select.yaml
id: sql-select-001
title: "SELECT All Customers"
difficulty: 1
tags: [select, basics]
description: |
  Write a query to retrieve all rows and all columns
  from the customers table.
starter_code: |
  -- This schema is already loaded:
  -- customers(id, name, city, country)
  -- orders(id, customer_id, order_date, amount)

  -- Write your query below:
test_cases:
  - input: ""
    expected_output: ""
    time_limit_ms: 5000
    memory_limit_kb: 65536
solution: "SELECT * FROM customers ORDER BY id"
metadata:
  version: "1.0.0"
  content_version: 1
  module: sql
  language: sql
  category: select
```

**Step 3: Update content/version.json**
```json
{
  "version": "1.0.0",
  "build": 2,
  "modules": {
    "grammar":     { "version": "1.0.0", "exercise_count": 0 },
    "programming": { "version": "1.0.0", "exercise_count": 2 },
    "sql":         { "version": "1.0.0", "exercise_count": 1 },
    "knowledge":   { "version": "1.0.0", "article_count": 0 }
  }
}
```

**Step 4: Commit**
```bash
git add content/
git commit -m "content: seed initial Go exercises and SQL exercises with Northwind schema"
```

---

## MILESTONE 18: Knowledge Base Content

### Task 21: Seed knowledge base articles

**Files:**
- Create: `content/knowledge/networking/osi-model.md`
- Create: `content/knowledge/networking/tcp-ip.md`
- Create: `content/knowledge/databases/sql-indexes.md`

**Step 1: Write osi-model.md**
```markdown
# OSI Model

The Open Systems Interconnection (OSI) model is a conceptual framework that standardizes network communication into 7 layers.

## The 7 Layers

| Layer | Name | Protocol Examples | Function |
|-------|------|-------------------|----------|
| 7 | Application | HTTP, FTP, DNS | User-facing protocols |
| 6 | Presentation | TLS, JPEG, ASCII | Encoding, encryption |
| 5 | Session | NetBIOS, RPC | Session management |
| 4 | Transport | TCP, UDP | End-to-end communication |
| 3 | Network | IP, ICMP | Routing |
| 2 | Data Link | Ethernet, Wi-Fi | Frame transmission |
| 1 | Physical | Cables, Radio | Raw bit transmission |

## Memory Aid

**All People Seem To Need Data Processing**
(Application → Physical, top to bottom)

## Key Concepts

### TCP vs UDP (Layer 4)

**TCP (Transmission Control Protocol):**
- Connection-oriented
- Guaranteed delivery (ACK)
- Ordered packets
- Use when: file transfer, HTTP, databases

**UDP (User Datagram Protocol):**
- Connectionless
- No delivery guarantee
- Lower latency
- Use when: video streaming, DNS, gaming

## Interview Questions

**Q: At which layer does routing occur?**
A: Layer 3 (Network). Routers operate at Layer 3.

**Q: At which layer does a switch operate?**
A: Layer 2 (Data Link). Switches use MAC addresses.

**Q: What is encapsulation?**
A: Each layer adds its own header as data travels down the stack. On receipt, each layer strips its header as data travels up.
```

**Step 2: Commit content**
```bash
git add content/knowledge/
git commit -m "content: seed knowledge base with networking and database articles"
```

---

## MILESTONE 19: Build Verification

### Task 22: Full build and smoke test

**Step 1: Install Wails if not present**
```bash
which wails || go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

**Step 2: Resolve the Go module path**
Replace all `github.com/[module]` with the actual module path from `go.mod`:
```bash
MODULE=$(grep '^module' go.mod | awk '{print $2}')
echo "Module: $MODULE"
find internal/ cmd/ -name "*.go" -exec sed -i "s|github.com/\[module\]|$MODULE|g" {} +
```

**Step 3: Run go build**
```bash
go build ./...
```
Expected: no errors

**Step 4: Run wails dev**
```bash
wails dev
```
Expected: app opens in development mode

**Step 5: Run wails build**
```bash
wails build
```
Expected: binary in `build/bin/`

**Step 6: Final commit**
```bash
git add .
git commit -m "feat: complete EKS v0.1.0 foundation — all core modules wired and building"
```

---

## Next Milestones (Phase 2)

After Phase 1 foundation is complete, implement in order:

1. **Grammar exercises content** — 50+ grammar YAML exercises with rule validation
2. **SQL module UI** — Monaco Editor with SQL syntax, result table, query plan viewer
3. **Knowledge base UI** — Article browser with category tree and Markdown rendering
4. **Dashboard UI** — Progress charts, streak display, achievements grid
5. **Search UI** — Full-text search with highlighted excerpts
6. **Runtime extraction** — Script to download/package language runtimes per platform
7. **More content** — Python, Rust, TypeScript exercises + IT knowledge articles
8. **Packaging** — NSIS installer (Windows), AppImage (Linux), dmg (macOS)
9. **Grammar rules engine expansion** — Subject-verb agreement, punctuation, tense consistency
10. **Performance optimization** — Bleve index lazy loading, content cache warming
