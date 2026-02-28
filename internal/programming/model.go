package programming

import "github.com/eks/eks/internal/sandbox"

// SubmitRequest is the payload when a user submits code for evaluation.
type SubmitRequest struct {
	ExerciseID string           `json:"exerciseId"`
	Language   sandbox.Language `json:"language"`
	Code       string           `json:"code"`
}

// TestResult holds the outcome of running one test case.
type TestResult struct {
	TestIndex      int    `json:"testIndex"`
	Passed         bool   `json:"passed"`
	ExpectedOutput string `json:"expectedOutput"`
	ActualOutput   string `json:"actualOutput"`
	TimeMs         int64  `json:"timeMs"`
	TimedOut       bool   `json:"timedOut"`
}

// SubmitResult is the aggregate result of running all test cases.
type SubmitResult struct {
	Passed      bool         `json:"passed"`
	Score       int          `json:"score"` // 0-100 (% of tests passing)
	TestResults []TestResult `json:"testResults"`
	Error       string       `json:"error,omitempty"`
}
