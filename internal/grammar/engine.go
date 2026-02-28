package grammar

import (
	"strings"
	"unicode"

	"github.com/eks/eks/internal/grammar/grammarmodel"
	"github.com/eks/eks/internal/grammar/rules"
)

// Engine applies a set of grammar rules to text.
type Engine struct {
	rules []grammarmodel.GrammarRule
}

// NewEngine constructs an Engine with all built-in grammar rules.
func NewEngine() *Engine {
	return &Engine{
		rules: []grammarmodel.GrammarRule{
			rules.NewArticleRule(),
			rules.NewDoubleWordRule(),
			rules.NewCapitalizationRule(),
		},
	}
}

// Validate runs all rules against the input text and returns a ValidationResult.
func (e *Engine) Validate(text string) grammarmodel.ValidationResult {
	tokens := tokenize(text)
	var errs []grammarmodel.ValidationError
	for _, rule := range e.rules {
		errs = append(errs, rule.Validate(tokens)...)
	}
	if errs == nil {
		errs = []grammarmodel.ValidationError{}
	}
	score := computeScore(len(tokens), len(errs))
	return grammarmodel.ValidationResult{
		Input:   text,
		Errors:  errs,
		Score:   score,
		IsValid: len(errs) == 0,
	}
}

// tokenize splits text into Tokens preserving byte positions.
func tokenize(text string) []grammarmodel.Token {
	var tokens []grammarmodel.Token
	i := 0
	runes := []rune(text)
	for i < len(runes) {
		// Skip non-word runes
		if !isWordRune(runes[i]) {
			i++
			continue
		}
		start := i
		for i < len(runes) && isWordRune(runes[i]) {
			i++
		}
		word := string(runes[start:i])
		bytePos := len(string(runes[:start]))
		tokens = append(tokens, grammarmodel.Token{
			Text:     word,
			Lower:    strings.ToLower(word),
			Position: bytePos,
		})
	}
	return tokens
}

func isWordRune(r rune) bool {
	return unicode.IsLetter(r) || unicode.IsDigit(r) || r == '\''
}

func computeScore(tokenCount, errorCount int) int {
	if tokenCount == 0 {
		return 100
	}
	if errorCount == 0 {
		return 100
	}
	penalty := (errorCount * 100) / tokenCount
	if penalty > 100 {
		penalty = 100
	}
	return 100 - penalty
}
