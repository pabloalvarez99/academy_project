package rules

import (
	"github.com/eks/eks/internal/grammar/grammarmodel"
)

// vowel sounds: words starting with these letters use "an"
var vowelSet = map[byte]bool{
	'a': true, 'e': true, 'i': true, 'o': true, 'u': true,
}

// Exception words where spelling doesn't match sound
var aExceptions = map[string]bool{
	// "an" before these even though they start with consonant
	"hour": true, "honest": true, "honour": true, "heir": true,
}
var anExceptions = map[string]bool{
	// "a" before these even though they start with vowel
	"unicorn": true, "university": true, "uniform": true, "union": true,
	"unit": true, "unique": true, "user": true, "use": true,
	"usual": true, "used": true, "utility": true,
}

// ArticleRule validates correct usage of "a" vs "an".
type ArticleRule struct{}

func NewArticleRule() *ArticleRule    { return &ArticleRule{} }
func (r *ArticleRule) Name() string   { return "articles" }

func (r *ArticleRule) Validate(tokens []grammarmodel.Token) []grammarmodel.ValidationError {
	var errs []grammarmodel.ValidationError
	for i := 0; i+1 < len(tokens); i++ {
		t := tokens[i]
		next := tokens[i+1]
		if t.Lower != "a" && t.Lower != "an" {
			continue
		}
		nextLower := next.Lower
		if len(nextLower) == 0 {
			continue
		}

		shouldBeAn := vowelSet[nextLower[0]] || aExceptions[nextLower]
		if anExceptions[nextLower] {
			shouldBeAn = false
		}

		isAn := t.Lower == "an"
		if isAn == shouldBeAn {
			continue // correct usage
		}

		correct := "a"
		if shouldBeAn {
			correct = "an"
		}
		errs = append(errs, grammarmodel.ValidationError{
			Position: t.Position,
			Length:   len(t.Text),
			Message:  `Use "` + correct + `" before "` + next.Text + `"`,
			Rule:     r.Name(),
			Original: t.Text,
			Suggest:  correct,
		})
	}
	return errs
}
