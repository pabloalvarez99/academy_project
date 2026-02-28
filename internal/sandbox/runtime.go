package sandbox

import (
	"fmt"
	"os"
	"path/filepath"
)

// RuntimeInfo describes an extractable language runtime.
type RuntimeInfo struct {
	Language   Language
	BinaryName string // e.g. "go", "python3"
}

// CheckRuntime verifies that a language's runtime binary is available,
// either in the system PATH or in the EKS runtimes directory.
func (m *Manager) CheckRuntime(lang Language) (bool, string) {
	cfg, ok := languageConfigs[lang]
	if !ok {
		return false, "unknown language"
	}
	if len(cfg.Runner) == 0 {
		return false, "no runner configured"
	}
	binary := cfg.Runner[0]

	// Check runtimes dir first
	runtimePath := filepath.Join(m.runtimesDir, binary)
	if _, err := os.Stat(runtimePath); err == nil {
		return true, runtimePath
	}
	// Check system PATH
	resolved := resolveRuntime("", binary)
	if resolved != binary {
		return true, resolved
	}
	// Try exec.LookPath via resolveRuntime
	return false, fmt.Sprintf("%s not found in runtimes or PATH", binary)
}

// CheckAllRuntimes returns availability status for all languages.
func (m *Manager) CheckAllRuntimes() map[Language]bool {
	result := make(map[Language]bool, len(AllLanguages))
	for _, lang := range AllLanguages {
		ok, _ := m.CheckRuntime(lang)
		result[lang] = ok
	}
	return result
}
