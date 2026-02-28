package grammar

import "github.com/eks/eks/internal/grammar/grammarmodel"

// Token is a single word/token from the input text with its position.
type Token = grammarmodel.Token

// ValidationError describes a single grammar mistake.
type ValidationError = grammarmodel.ValidationError

// ValidationResult is the full result of validating a text.
type ValidationResult = grammarmodel.ValidationResult

// GrammarRule is the interface every grammar rule must implement.
type GrammarRule = grammarmodel.GrammarRule
