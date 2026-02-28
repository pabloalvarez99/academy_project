package rules

import "github.com/eks/eks/internal/grammar/grammarmodel"

// DoubleWordRule detects accidentally repeated words ("the the", "and and").
type DoubleWordRule struct{}

func NewDoubleWordRule() *DoubleWordRule { return &DoubleWordRule{} }
func (r *DoubleWordRule) Name() string   { return "double_word" }

func (r *DoubleWordRule) Validate(tokens []grammarmodel.Token) []grammarmodel.ValidationError {
	var errs []grammarmodel.ValidationError
	for i := 1; i < len(tokens); i++ {
		if tokens[i].Lower == tokens[i-1].Lower {
			errs = append(errs, grammarmodel.ValidationError{
				Position: tokens[i].Position,
				Length:   len(tokens[i].Text),
				Message:  `Repeated word: "` + tokens[i].Text + `"`,
				Rule:     r.Name(),
				Original: tokens[i].Text,
				Suggest:  "",
			})
		}
	}
	return errs
}
