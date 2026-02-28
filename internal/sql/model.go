package sqllab

// QueryResult holds the output of a SQL query execution.
type QueryResult struct {
	Columns      []string        `json:"columns"`
	Rows         [][]interface{} `json:"rows"`
	RowsAffected int64           `json:"rowsAffected"`
	TimeMs       int64           `json:"timeMs"`
	Error        string          `json:"error,omitempty"`
}

// EvaluationResult is returned after evaluating a user's query against the expected solution.
type EvaluationResult struct {
	Passed     bool        `json:"passed"`
	UserResult QueryResult `json:"userResult"`
	Score      int         `json:"score"` // 0 or 100
	Message    string      `json:"message"`
	QueryPlan  string      `json:"queryPlan,omitempty"`
}
