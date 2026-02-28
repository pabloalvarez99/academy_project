package sandbox

// Language identifies a supported programming language.
type Language string

const (
	Go         Language = "go"
	Rust        Language = "rust"
	TypeScript  Language = "typescript"
	Python      Language = "python"
	Java        Language = "java"
	C           Language = "c"
	Cpp         Language = "cpp"
)

// AllLanguages lists all supported languages.
var AllLanguages = []Language{Go, Rust, TypeScript, Python, Java, C, Cpp}

// Request describes a code execution request.
type Request struct {
	Language      Language `json:"language"`
	Code          string   `json:"code"`
	Stdin         string   `json:"stdin"`
	TimeLimitMs   int      `json:"timeLimitMs"`
	MemoryLimitKB int      `json:"memoryLimitKb"`
}

// Result is the output of a code execution.
type Result struct {
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
	ExitCode int    `json:"exitCode"`
	TimeMs   int64  `json:"timeMs"`
	MemoryKB int64  `json:"memoryKb"`
	Compiled bool   `json:"compiled"`
	TimedOut bool   `json:"timedOut"`
	Error    string `json:"error,omitempty"`
}

// LanguageConfig describes how to compile and run a language.
type LanguageConfig struct {
	Extension  string   // source file extension (e.g. "go")
	SourceFile string   // source filename (e.g. "main.go")
	Compiler   []string // compiler command + args; nil = interpreted
	Runner     []string // run command + args (use {{OUTPUT}} for binary path)
	OutputFile string   // compiled output filename; empty = interpreted
}

// languageConfigs maps each language to its build/run configuration.
var languageConfigs = map[Language]LanguageConfig{
	Go: {
		Extension:  "go",
		SourceFile: "main.go",
		Compiler:   []string{"go", "build", "-o", "main", "main.go"},
		Runner:     []string{"./main"},
		OutputFile: "main",
	},
	Python: {
		Extension:  "py",
		SourceFile: "main.py",
		Runner:     []string{"python3", "main.py"},
	},
	TypeScript: {
		Extension:  "ts",
		SourceFile: "main.ts",
		Runner:     []string{"deno", "run", "--no-prompt", "main.ts"},
	},
	Java: {
		Extension:  "java",
		SourceFile: "Main.java",
		Compiler:   []string{"javac", "Main.java"},
		Runner:     []string{"java", "Main"},
	},
	C: {
		Extension:  "c",
		SourceFile: "main.c",
		Compiler:   []string{"tcc", "-o", "main", "main.c"},
		Runner:     []string{"./main"},
		OutputFile: "main",
	},
	Cpp: {
		Extension:  "cpp",
		SourceFile: "main.cpp",
		Compiler:   []string{"g++", "-o", "main", "main.cpp"},
		Runner:     []string{"./main"},
		OutputFile: "main",
	},
	Rust: {
		Extension:  "rs",
		SourceFile: "main.rs",
		Compiler:   []string{"rustc", "-o", "main", "main.rs"},
		Runner:     []string{"./main"},
		OutputFile: "main",
	},
}
