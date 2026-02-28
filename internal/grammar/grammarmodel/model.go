// Package grammarmodel defines the shared types used by the grammar engine
// and its rule sub-packages to avoid import cycles.
package grammarmodel

// Token is a single word/token from the input text with its position.
type Token struct {
	Text     string
	Lower    string // pre-computed lowercase
	Position int    // byte offset in original string
}

// ValidationError describes a single grammar mistake.
type ValidationError struct {
	Position int    `json:"position"` // byte offset of the problematic token
	Length   int    `json:"length"`   // length of the problematic text
	Message  string `json:"message"`  // human-readable description
	Rule     string `json:"rule"`     // rule ID that triggered this
	Original string `json:"original"` // the problematic text
	Suggest  string `json:"suggest"`  // suggested correction (may be empty)
}

// ValidationResult is the full result of validating a text.
type ValidationResult struct {
	Input   string            `json:"input"`
	Errors  []ValidationError `json:"errors"`
	Score   int               `json:"score"`   // 0-100 quality score
	IsValid bool              `json:"isValid"` // true if no errors
}

// GrammarRule is the interface every grammar rule must implement.
type GrammarRule interface {
	Name() string
	Validate(tokens []Token) []ValidationError
}
