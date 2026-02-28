package main

import (
	"context"
	"os"
	"path/filepath"

	"github.com/eks/eks/internal/analytics"
	"github.com/eks/eks/internal/content"
	"github.com/eks/eks/internal/db"
	"github.com/eks/eks/internal/grammar"
	"github.com/eks/eks/internal/knowledge"
	"github.com/eks/eks/internal/programming"
	"github.com/eks/eks/internal/progress"
	"github.com/eks/eks/internal/sandbox"
	"github.com/eks/eks/internal/search"
	sqllab "github.com/eks/eks/internal/sql"
	"github.com/eks/eks/internal/user"
)

// App is the main EKS application struct, bound to the Wails runtime.
// All exported methods on App are automatically exposed to the frontend.
type App struct {
	ctx         context.Context
	database    *db.DB
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

// NewApp creates a new App instance (called by Wails at startup).
func NewApp() *App {
	return &App{}
}

// startup is called by Wails after the app window is ready.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Open and migrate database
	dataDir := db.DataDir()
	database, err := db.Open(dataDir)
	if err != nil {
		panic("failed to open database: " + err.Error())
	}
	if err := database.Migrate(); err != nil {
		panic("failed to migrate database: " + err.Error())
	}
	a.database = database

	// Initialize services
	sb := sandbox.NewManager()
	a.sandbox = sb
	a.users = user.NewService(database)
	a.grammar = grammar.NewService()
	a.programming = programming.NewService(sb)
	a.sqlLab = sqllab.NewService()
	a.knowledge = knowledge.NewService()
	a.progress = progress.NewService(database)
	a.analytics = analytics.NewLogger(database, "")

	// Initialize and warm up search index (background goroutine)
	searchDir := filepath.Join(dataDir, "search")
	if err := os.MkdirAll(searchDir, 0755); err == nil {
		if engine, searchErr := search.Open(searchDir); searchErr == nil {
			a.search = engine
			go func() {
				count, _ := engine.DocCount()
				if count == 0 {
					_ = engine.IndexAllContent()
				}
			}()
		}
	}
}

// shutdown is called by Wails when the app is closing.
func (a *App) shutdown(ctx context.Context) {
	if a.database != nil {
		_ = a.database.Close()
	}
	if a.search != nil {
		a.search.Close()
	}
}

// ── User Management ───────────────────────────────────────────────────────────

// ListUsers returns all user profiles ordered by most recently active.
func (a *App) ListUsers() ([]user.User, error) {
	return a.users.ListUsers()
}

// CreateUser creates a new user profile.
func (a *App) CreateUser(req user.CreateUserRequest) (*user.User, error) {
	return a.users.CreateUser(req)
}

// Login authenticates a user and sets them as the active user.
func (a *App) Login(username, pin string) (*user.User, error) {
	u, err := a.users.AuthenticateUser(username, pin)
	if err != nil {
		return nil, err
	}
	a.currentUser = u.ID
	a.analytics.SetUser(u.ID)
	a.analytics.AppStart()
	return u, nil
}

// Logout clears the active user session.
func (a *App) Logout() {
	a.currentUser = ""
	a.analytics.SetUser("")
}

// ── Grammar Module ────────────────────────────────────────────────────────────

// ValidateGrammar runs all grammar rules against the given text.
func (a *App) ValidateGrammar(text string) grammar.ValidationResult {
	a.analytics.ModuleOpen("grammar")
	return a.grammar.ValidateText(text)
}

// ListGrammarExercises returns all available grammar exercise paths.
func (a *App) ListGrammarExercises() ([]string, error) {
	return a.grammar.ListExercises()
}

// GetGrammarExercise loads a grammar exercise by ID.
func (a *App) GetGrammarExercise(id string) (*content.Exercise, error) {
	return a.grammar.GetExercise(id)
}

// ── Programming Lab ───────────────────────────────────────────────────────────

// ListProgrammingExercises returns exercise paths for a given language.
func (a *App) ListProgrammingExercises(lang string) ([]string, error) {
	return a.programming.ListExercises(sandbox.Language(lang))
}

// GetProgrammingExercise loads a programming exercise.
func (a *App) GetProgrammingExercise(lang, id string) (*content.Exercise, error) {
	return a.programming.GetExercise(sandbox.Language(lang), id)
}

// SubmitCode evaluates a code submission against exercise test cases.
func (a *App) SubmitCode(req programming.SubmitRequest) (programming.SubmitResult, error) {
	a.analytics.ExerciseStart(req.ExerciseID, "programming")
	result, err := a.programming.Submit(req)
	if err != nil {
		return result, err
	}
	status := "failed"
	if result.Passed {
		status = "passed"
	}
	if a.currentUser != "" {
		_ = a.progress.RecordAttempt(
			a.currentUser, req.ExerciseID, "programming",
			string(req.Language), status, req.Code, "", result.Score, 0,
		)
	}
	a.analytics.ExerciseComplete(req.ExerciseID, result.Passed, result.Score, 0)
	return result, nil
}

// CheckRuntimes returns which language runtimes are available.
func (a *App) CheckRuntimes() map[string]bool {
	raw := a.sandbox.CheckAllRuntimes()
	result := make(map[string]bool, len(raw))
	for lang, ok := range raw {
		result[string(lang)] = ok
	}
	return result
}

// ── SQL Laboratory ────────────────────────────────────────────────────────────

// ExecuteSQLExercise evaluates a user's SQL query against an exercise.
func (a *App) ExecuteSQLExercise(exerciseID, query string) sqllab.EvaluationResult {
	a.analytics.ExerciseStart(exerciseID, "sql")
	result := a.sqlLab.ExecuteQuery(exerciseID, query)
	if a.currentUser != "" {
		status := "failed"
		if result.Passed {
			status = "passed"
		}
		_ = a.progress.RecordAttempt(
			a.currentUser, exerciseID, "sql", "sql", status, query, "", result.Score, result.UserResult.TimeMs,
		)
	}
	return result
}

// RunFreeSQL executes arbitrary SQL against a provided schema (playground mode).
func (a *App) RunFreeSQL(schema, query string) sqllab.QueryResult {
	return a.sqlLab.FreeQuery(schema, query)
}

// ListSQLExercises returns all SQL exercise paths.
func (a *App) ListSQLExercises() ([]string, error) {
	return a.sqlLab.ListExercises()
}

// ── Knowledge Base ────────────────────────────────────────────────────────────

// ListKnowledgeCategories returns all knowledge base categories.
func (a *App) ListKnowledgeCategories() ([]knowledge.Category, error) {
	return a.knowledge.ListCategories()
}

// ListKnowledgeArticles returns article IDs for a category.
func (a *App) ListKnowledgeArticles(category string) ([]string, error) {
	return a.knowledge.ListArticles(category)
}

// GetArticle loads and renders a knowledge base article as HTML.
func (a *App) GetArticle(category, id string) (*knowledge.Article, error) {
	a.analytics.PageView("knowledge/" + category + "/" + id)
	return a.knowledge.GetArticle(category, id)
}

// ── Progress & Stats ──────────────────────────────────────────────────────────

// GetUserStats returns the full statistics snapshot for the active user.
func (a *App) GetUserStats() (*progress.UserStats, error) {
	if a.currentUser == "" {
		return &progress.UserStats{
			ModuleProgress: []progress.ModuleProgress{},
			Achievements:   []progress.Achievement{},
		}, nil
	}
	return a.progress.GetStats(a.currentUser)
}

// GetAchievements returns all achievements with earned status.
func (a *App) GetAchievements() []progress.Achievement {
	if a.currentUser == "" {
		return []progress.Achievement{}
	}
	return a.progress.ListAchievements(a.currentUser)
}

// ── Search ────────────────────────────────────────────────────────────────────

// SearchContent performs a full-text search across all content.
func (a *App) SearchContent(query string) ([]search.SearchResult, error) {
	if a.search == nil {
		return []search.SearchResult{}, nil
	}
	results, err := a.search.Search(query, 25)
	if err != nil {
		return nil, err
	}
	a.analytics.Search(query, len(results))
	if results == nil {
		results = []search.SearchResult{}
	}
	return results, nil
}

// ── Content Version ───────────────────────────────────────────────────────────

// GetContentVersion returns the embedded content version manifest.
func (a *App) GetContentVersion() (*content.ContentVersion, error) {
	return content.LoadVersion()
}
