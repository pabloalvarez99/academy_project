package grammar

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
