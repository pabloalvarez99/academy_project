package sqllab

import (
	"strings"
	"sync"

	"github.com/eks/eks/internal/content"
)

// Service is the SQL Laboratory module API.
type Service struct {
	engine         *Engine
	northwindOnce  sync.Once
	northwindSchema string
}

// NewService creates a SQL Service.
func NewService() *Service {
	return &Service{engine: NewEngine()}
}

// northwind returns the cached Northwind DDL, loading it once from the embedded FS.
func (s *Service) northwind() string {
	s.northwindOnce.Do(func() {
		data, err := content.ReadFile("sql/schemas/northwind-mini.sql")
		if err == nil {
			s.northwindSchema = string(data)
		}
	})
	return s.northwindSchema
}

// exercisePath converts a raw exercise ID to a content-relative path.
// If the ID already starts with "sql/", use it directly (stripping .yaml and re-adding).
// Otherwise prepend "sql/exercises/" and append ".yaml".
func exercisePath(id string) string {
	// strip .yaml if present
	id = strings.TrimSuffix(id, ".yaml")
	if strings.HasPrefix(id, "sql/") {
		return id + ".yaml"
	}
	return "sql/exercises/" + id + ".yaml"
}

// GetExercise loads a SQL exercise by ID.
func (s *Service) GetExercise(exerciseID string) (*content.Exercise, error) {
	return content.LoadExercise(exercisePath(exerciseID))
}

// ExecuteQuery evaluates a user's SQL query against the expected solution for an exercise.
// All SQL exercises run against the Northwind schema.
func (s *Service) ExecuteQuery(exerciseID, userQuery string) EvaluationResult {
	ex, err := content.LoadExercise(exercisePath(exerciseID))
	if err != nil {
		return EvaluationResult{Message: "exercise not found: " + err.Error()}
	}

	schema := s.northwind()

	userResult := s.engine.RunQuery(schema, userQuery)
	if userResult.Error != "" {
		return EvaluationResult{
			UserResult: userResult,
			Message:    "Query error: " + userResult.Error,
		}
	}

	expectedResult := s.engine.RunQuery(schema, ex.Solution)
	passed := compareResults(userResult, expectedResult)

	score := 0
	if passed {
		score = 100
	}

	plan := s.engine.GetQueryPlan(schema, userQuery)

	msg := "Incorrect — your result doesn't match the expected output."
	if passed {
		msg = "Correct! Your query produces the expected result."
	}

	return EvaluationResult{
		Passed:     passed,
		UserResult: userResult,
		Score:      score,
		Message:    msg,
		QueryPlan:  plan,
	}
}

// FreeQuery runs an arbitrary SQL query against the Northwind schema (playground mode).
// If an explicit schema is provided it takes precedence.
func (s *Service) FreeQuery(schema, query string) QueryResult {
	if schema == "" {
		schema = s.northwind()
	}
	return s.engine.RunQuery(schema, query)
}

// ListExercises returns all SQL exercise paths.
func (s *Service) ListExercises() ([]string, error) {
	return content.ListExercises("sql", "")
}
