package search

import (
	"io/fs"
	"path/filepath"
	"strings"

	"github.com/eks/eks/embedcontent"
)

// IndexAllContent walks the embedded content FS and indexes every file.
// This is intended to be called once at startup in a goroutine.
func (e *Engine) IndexAllContent() error {
	return fs.WalkDir(embedcontent.FS, "content", func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil // skip errors and directories silently
		}

		// Only index Markdown articles and YAML exercises
		ext := strings.ToLower(filepath.Ext(path))
		if ext != ".md" && ext != ".yaml" {
			return nil
		}

		data, readErr := fs.ReadFile(embedcontent.FS, path)
		if readErr != nil {
			return nil // skip unreadable files
		}

		// Derive module and category from path structure
		// path: "content/<module>/<category>/..."
		parts := strings.SplitN(strings.TrimPrefix(path, "content/"), "/", 3)
		module, category := "", ""
		if len(parts) >= 1 {
			module = parts[0]
		}
		if len(parts) >= 2 {
			category = parts[1]
		}

		body := string(data)
		title := extractDocTitle(body, path)

		return e.IndexDocument(path, title, module, category, body)
	})
}

// extractDocTitle tries to find a title from Markdown heading or YAML title field.
func extractDocTitle(body, path string) string {
	for _, line := range strings.Split(body, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "# ") {
			return strings.TrimPrefix(line, "# ")
		}
		if strings.HasPrefix(line, "title:") {
			t := strings.TrimSpace(strings.TrimPrefix(line, "title:"))
			return strings.Trim(t, `"'`)
		}
	}
	// Fall back to filename
	base := filepath.Base(path)
	return strings.TrimSuffix(base, filepath.Ext(base))
}
