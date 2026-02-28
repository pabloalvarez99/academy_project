package sqllab

import "github.com/eks/eks/internal/content"

// Service is the SQL Laboratory module API.
type Service struct {
	engine *Engine
}

// NewService creates a SQL Service.
func NewService() *Service {
	return &Service{engine: NewEngine()}
}

// ExecuteQuery evaluates a user's SQL query against the expected solution for an exercise.
// The exercise's starter_code field contains the schema SQL to pre-load.
func (s *Service) ExecuteQuery(exerciseID, userQuery string) EvaluationResult {
	ex, err := content.LoadExercise("sql/exercises/" + exerciseID + ".yaml")
	if err != nil {
		return EvaluationResult{Message: "exercise not found: " + err.Error()}
	}

	schema := ex.StarterCode // starter_code = schema DDL for SQL exercises

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

// FreeQuery runs an arbitrary SQL query against a provided schema (for sandbox/playground mode).
func (s *Service) FreeQuery(schema, query string) QueryResult {
	return s.engine.RunQuery(schema, query)
}

// ListExercises returns all SQL exercise paths.
func (s *Service) ListExercises() ([]string, error) {
	return content.ListExercises("sql", "")
}
