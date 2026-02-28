package sandbox

import "runtime"

// platformBinaryName returns the platform-appropriate binary filename.
// On Windows, Go/Rust/C binaries have .exe extension.
func platformBinaryName(base string) string {
	if runtime.GOOS == "windows" {
		return base + ".exe"
	}
	return base
}
