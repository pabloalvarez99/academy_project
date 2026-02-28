package rules

import (
	"unicode"
	"unicode/utf8"

	"github.com/eks/eks/internal/grammar/grammarmodel"
)

// CapitalizationRule checks that the first token of a sentence is capitalized.
type CapitalizationRule struct{}

func NewCapitalizationRule() *CapitalizationRule { return &CapitalizationRule{} }
func (r *CapitalizationRule) Name() string        { return "capitalization" }

func (r *CapitalizationRule) Validate(tokens []grammarmodel.Token) []grammarmodel.ValidationError {
	if len(tokens) == 0 {
		return nil
	}
	first := tokens[0]
	r0, _ := utf8.DecodeRuneInString(first.Text)
	if r0 == utf8.RuneError {
		return nil
	}
	if unicode.IsLetter(r0) && !unicode.IsUpper(r0) {
		return []grammarmodel.ValidationError{{
			Position: first.Position,
			Length:   len(first.Text),
			Message:  "Sentence should start with a capital letter",
			Rule:     r.Name(),
			Original: first.Text,
			Suggest:  string(unicode.ToUpper(r0)) + first.Text[len(string(r0)):],
		}}
	}
	return nil
}
