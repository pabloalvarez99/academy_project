package programming

import (
	"strings"

	"github.com/eks/eks/internal/content"
	"github.com/eks/eks/internal/sandbox"
)

// Service manages the multi-language programming lab.
type Service struct {
	sandbox *sandbox.Manager
}

// NewService creates a programming lab Service.
func NewService(sb *sandbox.Manager) *Service {
	return &Service{sandbox: sb}
}

// Submit evaluates a user's code submission against all test cases.
func (s *Service) Submit(req SubmitRequest) (SubmitResult, error) {
	// Build the content path: "programming/go/exercises/basics/001-hello.yaml"
	// ExerciseID can be a full relative path or just a filename
	path := buildExercisePath(req.Language, req.ExerciseID)
	ex, err := content.LoadExercise(path)
	if err != nil {
		return SubmitResult{Error: "exercise not found: " + err.Error()}, err
	}

	if len(ex.TestCases) == 0 {
		return SubmitResult{Error: "exercise has no test cases"}, nil
	}

	var results []TestResult
	passedCount := 0

	for i, tc := range ex.TestCases {
		timeLimitMs := tc.TimeLimitMs
		if timeLimitMs <= 0 {
			timeLimitMs = 10_000
		}
		memLimitKB := tc.MemoryLimitKB
		if memLimitKB <= 0 {
			memLimitKB = 131_072 // 128 MB
		}

		execReq := sandbox.Request{
			Language:      req.Language,
			Code:          req.Code,
			Stdin:         tc.Input,
			TimeLimitMs:   timeLimitMs,
			MemoryLimitKB: memLimitKB,
		}

		result, execErr := s.sandbox.Execute(execReq)
		if execErr != nil {
			results = append(results, TestResult{
				TestIndex:      i,
				Passed:         false,
				ExpectedOutput: tc.ExpectedOutput,
				ActualOutput:   "execution error: " + execErr.Error(),
			})
			continue
		}

		actualOut := strings.TrimRight(result.Stdout, "\r\n")
		expectedOut := strings.TrimRight(tc.ExpectedOutput, "\r\n")
		passed := actualOut == expectedOut && !result.TimedOut

		if passed {
			passedCount++
		}

		results = append(results, TestResult{
			TestIndex:      i,
			Passed:         passed,
			ExpectedOutput: tc.ExpectedOutput,
			ActualOutput:   result.Stdout,
			TimeMs:         result.TimeMs,
			TimedOut:       result.TimedOut,
		})
	}

	totalTests := len(ex.TestCases)
	score := 0
	if totalTests > 0 {
		score = (passedCount * 100) / totalTests
	}

	return SubmitResult{
		Passed:      passedCount == totalTests,
		Score:       score,
		TestResults: results,
	}, nil
}

// GetExercise loads a programming exercise by language and ID.
func (s *Service) GetExercise(lang sandbox.Language, id string) (*content.Exercise, error) {
	return content.LoadExercise(buildExercisePath(lang, id))
}

// ListExercises returns all exercise paths for a given language.
func (s *Service) ListExercises(lang sandbox.Language) ([]string, error) {
	return content.ListExercises("programming", string(lang))
}

// ListExerciseMeta returns lightweight metadata for all exercises in a language.
func (s *Service) ListExerciseMeta(lang sandbox.Language) ([]content.ExerciseSummary, error) {
	return content.ListExerciseMeta("programming", string(lang))
}

// buildExercisePath constructs the content-relative path for an exercise.
// If id already looks like a full path (contains "/"), use it directly.
func buildExercisePath(lang sandbox.Language, id string) string {
	if strings.Contains(id, "/") {
		return id // already a full relative path
	}
	return "programming/" + string(lang) + "/exercises/" + id + ".yaml"
}
