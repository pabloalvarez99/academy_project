package sandbox

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// Manager orchestrates code execution in isolated temp directories.
type Manager struct {
	runtimesDir string
	workDir     string
}

// NewManager creates a sandbox Manager using the default EKS directories.
func NewManager() *Manager {
	home, _ := os.UserHomeDir()
	return &Manager{
		runtimesDir: filepath.Join(home, ".eks", "runtimes"),
		workDir:     filepath.Join(home, ".eks", "sandbox"),
	}
}

// Execute compiles (if needed) and runs code, returning the execution result.
func (m *Manager) Execute(req Request) (Result, error) {
	cfg, ok := languageConfigs[req.Language]
	if !ok {
		return Result{}, fmt.Errorf("unsupported language: %s", req.Language)
	}

	// Ensure work directory exists
	if err := os.MkdirAll(m.workDir, 0755); err != nil {
		return Result{}, fmt.Errorf("create work dir: %w", err)
	}

	// Create isolated temp directory for this execution
	execDir, err := os.MkdirTemp(m.workDir, "exec-")
	if err != nil {
		return Result{}, fmt.Errorf("create exec dir: %w", err)
	}
	defer os.RemoveAll(execDir) // always clean up

	// Write source file
	srcPath := filepath.Join(execDir, cfg.SourceFile)
	if err := os.WriteFile(srcPath, []byte(req.Code), 0644); err != nil {
		return Result{}, fmt.Errorf("write source: %w", err)
	}

	return m.runWithConfig(execDir, cfg, req)
}

// runWithConfig handles the compile + run lifecycle for one execution.
func (m *Manager) runWithConfig(execDir string, cfg LanguageConfig, req Request) (Result, error) {
	res := Result{}

	// --- Compile step (if language is compiled) ---
	if len(cfg.Compiler) > 0 {
		compArgs := resolveArgs(m.runtimesDir, cfg.Compiler)
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		_, stderr, code, _, err := runProcess(ctx, execDir, compArgs, "", nil)
		if err != nil || code != 0 {
			res.Stderr = stderr
			res.Error = fmt.Sprintf("compilation failed (exit %d)", code)
			return res, nil
		}
		res.Compiled = true
	}

	// --- Run step ---
	timeLimitMs := req.TimeLimitMs
	if timeLimitMs <= 0 {
		timeLimitMs = 10_000 // default 10s
	}

	runCtx, runCancel := context.WithTimeout(context.Background(),
		time.Duration(timeLimitMs)*time.Millisecond)
	defer runCancel()

	runArgs := resolveArgs(m.runtimesDir, cfg.Runner)
	// For compiled languages, use the binary inside execDir
	if cfg.OutputFile != "" {
		runArgs[0] = filepath.Join(execDir, platformBinaryName(cfg.OutputFile))
	}

	stdout, stderr, exitCode, elapsed, err := runProcess(runCtx, execDir, runArgs, req.Stdin, nil)
	res.Stdout = stdout
	res.Stderr = stderr
	res.ExitCode = exitCode
	res.TimeMs = elapsed
	res.TimedOut = runCtx.Err() != nil
	if err != nil && !res.TimedOut {
		res.Error = err.Error()
	}
	return res, nil
}
