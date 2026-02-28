package sandbox

import (
	"bytes"
	"context"
	"os"
	"os/exec"
	"strings"
	"time"
)

// runProcess runs a command in execDir, capturing stdout/stderr.
// Returns stdout, stderr, exit code, elapsed ms, and any spawn error.
func runProcess(ctx context.Context, execDir string, args []string, stdin string, env []string) (stdout, stderr string, exitCode int, elapsedMs int64, err error) {
	cmd := exec.CommandContext(ctx, args[0], args[1:]...)
	cmd.Dir = execDir
	if env != nil {
		cmd.Env = env
	} else {
		cmd.Env = os.Environ()
	}
	cmd.Stdin = strings.NewReader(stdin)

	var outBuf, errBuf bytes.Buffer
	cmd.Stdout = &outBuf
	cmd.Stderr = &errBuf

	start := time.Now()
	runErr := cmd.Run()
	elapsedMs = time.Since(start).Milliseconds()

	stdout = outBuf.String()
	stderr = errBuf.String()

	if runErr != nil {
		if exitErr, ok := runErr.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			err = runErr
		}
	}
	return
}

// resolveRuntime prepends the runtime dir to the binary name if found there.
func resolveRuntime(runtimesDir, binary string) string {
	if runtimesDir == "" {
		return binary
	}
	// On Windows executables have .exe extension
	candidates := []string{binary, binary + ".exe"}
	for _, c := range candidates {
		path := runtimesDir + "/" + c
		if _, statErr := os.Stat(path); statErr == nil {
			return path
		}
	}
	return binary
}

// resolveArgs replaces the first element (binary) with the runtime-resolved path.
func resolveArgs(runtimesDir string, args []string) []string {
	if len(args) == 0 {
		return args
	}
	resolved := make([]string, len(args))
	copy(resolved, args)
	resolved[0] = resolveRuntime(runtimesDir, args[0])
	return resolved
}
