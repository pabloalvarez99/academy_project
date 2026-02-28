package content

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"path/filepath"
	"strings"
	"sync"

	"gopkg.in/yaml.v3"

	"github.com/eks/eks/embedcontent"
)

var (
	exerciseCache   = make(map[string]*Exercise)
	exerciseCacheMu sync.RWMutex
)

// LoadExercise loads and caches an exercise by its path relative to content/.
// Example path: "programming/go/exercises/basics/001-hello.yaml"
func LoadExercise(path string) (*Exercise, error) {
	exerciseCacheMu.RLock()
	if ex, ok := exerciseCache[path]; ok {
		exerciseCacheMu.RUnlock()
		return ex, nil
	}
	exerciseCacheMu.RUnlock()

	fullPath := "content/" + path
	data, err := fs.ReadFile(embedcontent.FS, fullPath)
	if err != nil {
		return nil, fmt.Errorf("read exercise %q: %w", path, err)
	}

	var ex Exercise
	if err := yaml.Unmarshal(data, &ex); err != nil {
		return nil, fmt.Errorf("parse exercise %q: %w", path, err)
	}

	exerciseCacheMu.Lock()
	exerciseCache[path] = &ex
	exerciseCacheMu.Unlock()
	return &ex, nil
}

// ListExercises returns all exercise file paths for a given module and optional language.
// module: "programming", "grammar", "sql"
// language: "go", "rust", etc. (empty = all)
func ListExercises(module, language string) ([]string, error) {
	base := filepath.ToSlash(filepath.Join("content", module))
	if language != "" {
		base = filepath.ToSlash(filepath.Join(base, language, "exercises"))
	}

	var paths []string
	err := fs.WalkDir(embedcontent.FS, base, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil // skip unreadable entries
		}
		if !d.IsDir() && strings.HasSuffix(path, ".yaml") {
			// Return path relative to content/
			rel := strings.TrimPrefix(path, "content/")
			paths = append(paths, rel)
		}
		return nil
	})
	if paths == nil {
		paths = []string{}
	}
	return paths, err
}

// LoadVersion returns the content version manifest.
func LoadVersion() (*ContentVersion, error) {
	data, err := fs.ReadFile(embedcontent.FS, "content/version.json")
	if err != nil {
		return nil, fmt.Errorf("read version.json: %w", err)
	}
	var v ContentVersion
	if err := json.Unmarshal(data, &v); err != nil {
		return nil, fmt.Errorf("parse version.json: %w", err)
	}
	return &v, nil
}

// ReadFile reads a raw file from the content FS.
func ReadFile(path string) ([]byte, error) {
	return fs.ReadFile(embedcontent.FS, "content/"+path)
}

// WalkDir walks the content FS starting at the given subpath.
func WalkDir(subpath string, fn fs.WalkDirFunc) error {
	return fs.WalkDir(embedcontent.FS, "content/"+subpath, fn)
}
