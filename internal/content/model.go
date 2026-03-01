package content

// Exercise is a structured learning exercise (programming, SQL, or grammar).
type Exercise struct {
	ID          string       `yaml:"id"           json:"id"`
	Title       string       `yaml:"title"        json:"title"`
	Difficulty  int          `yaml:"difficulty"   json:"difficulty"`
	Tags        []string     `yaml:"tags"         json:"tags"`
	Description string       `yaml:"description"  json:"description"`
	StarterCode string       `yaml:"starter_code" json:"starterCode"`
	TestCases   []TestCase   `yaml:"test_cases"   json:"testCases"`
	Hints       []string     `yaml:"hints"        json:"hints"`
	Solution    string       `yaml:"solution"     json:"solution"`
	Metadata    ExerciseMeta `yaml:"metadata"     json:"metadata"`
}

// TestCase defines one input->output pair for exercise evaluation.
type TestCase struct {
	Input          string `yaml:"input"            json:"input"`
	ExpectedOutput string `yaml:"expected_output"  json:"expectedOutput"`
	TimeLimitMs    int    `yaml:"time_limit_ms"    json:"timeLimitMs"`
	MemoryLimitKB  int    `yaml:"memory_limit_kb"  json:"memoryLimitKb"`
}

// ExerciseMeta holds versioning and classification metadata.
type ExerciseMeta struct {
	Version        string `yaml:"version"         json:"version"`
	ContentVersion int    `yaml:"content_version" json:"contentVersion"`
	Module         string `yaml:"module"          json:"module"`
	Language       string `yaml:"language"        json:"language"`
	Category       string `yaml:"category"        json:"category"`
}

// Article represents a knowledge-base article.
type Article struct {
	ID       string   `json:"id"`
	Title    string   `json:"title"`
	Category string   `json:"category"`
	Tags     []string `json:"tags"`
	Body     string   `json:"body"` // HTML rendered from Markdown
}

// ExerciseSummary is lightweight exercise metadata for listing without loading full content.
type ExerciseSummary struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	Difficulty int    `json:"difficulty"`
	Category   string `json:"category"`
}

// ContentVersion is the top-level content manifest embedded in content/version.json.
type ContentVersion struct {
	Version string                   `json:"version"`
	Build   int                      `json:"build"`
	Modules map[string]ModuleVersion `json:"modules"`
}

// ModuleVersion describes the version info for one content module.
type ModuleVersion struct {
	Version       string `json:"version"`
	ExerciseCount int    `json:"exercise_count,omitempty"`
	ArticleCount  int    `json:"article_count,omitempty"`
}
