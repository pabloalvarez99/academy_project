package rules

import (
	"github.com/eks/eks/internal/grammar/grammarmodel"
)

// contractionMap maps missing-apostrophe words to their correct forms.
var contractionMap = map[string]string{
	"cant":   "can't",
	"dont":   "don't",
	"wont":   "won't",
	"isnt":   "isn't",
	"arent":  "aren't",
	"wasnt":  "wasn't",
	"werent": "weren't",
	"hasnt":  "hasn't",
	"havent": "haven't",
	"hadnt":  "hadn't",
	"didnt":  "didn't",
	"doesnt": "doesn't",
	"wouldnt": "wouldn't",
	"shouldnt": "shouldn't",
	"couldnt": "couldn't",
	"mustnt":  "mustn't",
	"neednt":  "needn't",
	"ive":     "I've",
	"id":      "I'd",
	"ill":     "I'll",
	"youre":   "you're",
	"youve":   "you've",
	"youll":   "you'll",
	"youd":    "you'd",
	"theyre":  "they're",
	"theyve":  "they've",
	"theyll":  "they'll",
	"theyd":   "they'd",
	"weve":    "we've",
	"were":    "", // ambiguous — skip (could be past tense of "to be")
	"wed":     "", // ambiguous — skip
	"hes":     "he's",
	"shes":    "she's",
	"its":     "", // skip — "its" (possessive) is correct; "it's" is a different word
	"thats":   "that's",
	"whats":   "what's",
	"whos":    "who's",
	"wheres":  "where's",
	"hows":    "how's",
	"lets":    "let's",
}

// ContractionRule flags words that are likely missing apostrophes.
type ContractionRule struct{}

func NewContractionRule() *ContractionRule { return &ContractionRule{} }
func (r *ContractionRule) Name() string    { return "contraction" }

func (r *ContractionRule) Validate(tokens []grammarmodel.Token) []grammarmodel.ValidationError {
	var errs []grammarmodel.ValidationError
	for _, t := range tokens {
		correct, found := contractionMap[t.Lower]
		if !found || correct == "" {
			continue
		}
		errs = append(errs, grammarmodel.ValidationError{
			Position: t.Position,
			Length:   len(t.Text),
			Message:  `Missing apostrophe in "` + t.Text + `" — did you mean "` + correct + `"?`,
			Rule:     r.Name(),
			Original: t.Text,
			Suggest:  correct,
		})
	}
	return errs
}
