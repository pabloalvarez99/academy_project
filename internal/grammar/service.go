package grammar

import "github.com/eks/eks/internal/content"

// Service exposes grammar training functionality to the Wails app.
type Service struct {
	engine *Engine
}

// NewService creates a grammar Service with all rules loaded.
func NewService() *Service {
	return &Service{engine: NewEngine()}
}

// ValidateText runs all grammar rules against the given text.
func (s *Service) ValidateText(text string) ValidationResult {
	return s.engine.Validate(text)
}

// ListExercises returns all available grammar exercise paths.
func (s *Service) ListExercises() ([]string, error) {
	return content.ListExercises("grammar", "")
}

// GetExercise loads a grammar exercise by ID.
func (s *Service) GetExercise(id string) (*content.Exercise, error) {
	return content.LoadExercise("grammar/exercises/" + id + ".yaml")
}
