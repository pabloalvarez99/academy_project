package search

import (
	"fmt"
	"os"
	"path/filepath"

	bleve "github.com/blevesearch/bleve/v2"
)

// Engine wraps a Bleve full-text search index.
type Engine struct {
	index bleve.Index
}

// SearchResult is one item returned from a search query.
type SearchResult struct {
	ID       string  `json:"id"`
	Title    string  `json:"title"`
	Module   string  `json:"module"`
	Category string  `json:"category"`
	Excerpt  string  `json:"excerpt"`
	Score    float64 `json:"score"`
}

// Open opens an existing Bleve index or creates one if it doesn't exist.
func Open(dataDir string) (*Engine, error) {
	indexPath := filepath.Join(dataDir, "search.bleve")
	var (
		index bleve.Index
		err   error
	)
	if _, statErr := os.Stat(indexPath); os.IsNotExist(statErr) {
		mapping := bleve.NewIndexMapping()
		index, err = bleve.New(indexPath, mapping)
	} else {
		index, err = bleve.Open(indexPath)
	}
	if err != nil {
		return nil, fmt.Errorf("open bleve index at %s: %w", indexPath, err)
	}
	return &Engine{index: index}, nil
}

// Close releases the Bleve index resources.
func (e *Engine) Close() {
	if e.index != nil {
		e.index.Close()
	}
}

// IndexDocument indexes a single document.
func (e *Engine) IndexDocument(id, title, module, category, body string) error {
	doc := map[string]interface{}{
		"title":    title,
		"module":   module,
		"category": category,
		"body":     body,
		"excerpt":  truncate(body, 250),
	}
	return e.index.Index(id, doc)
}

// Search executes a full-text query and returns up to `limit` results.
func (e *Engine) Search(query string, limit int) ([]SearchResult, error) {
	if limit <= 0 {
		limit = 20
	}

	q := bleve.NewMatchQuery(query)
	req := bleve.NewSearchRequestOptions(q, limit, 0, false)
	req.Fields = []string{"title", "module", "category", "excerpt"}
	req.SortBy([]string{"-_score"})

	res, err := e.index.Search(req)
	if err != nil {
		return nil, fmt.Errorf("bleve search: %w", err)
	}

	results := make([]SearchResult, 0, len(res.Hits))
	for _, hit := range res.Hits {
		r := SearchResult{ID: hit.ID, Score: hit.Score}
		if v, ok := hit.Fields["title"].(string); ok {
			r.Title = v
		}
		if v, ok := hit.Fields["module"].(string); ok {
			r.Module = v
		}
		if v, ok := hit.Fields["category"].(string); ok {
			r.Category = v
		}
		if v, ok := hit.Fields["excerpt"].(string); ok {
			r.Excerpt = v
		}
		results = append(results, r)
	}
	return results, nil
}

// DocCount returns the number of documents in the index.
func (e *Engine) DocCount() (uint64, error) {
	return e.index.DocCount()
}

func truncate(s string, n int) string {
	// Strip common Markdown/YAML syntax for cleaner excerpts
	runes := []rune(s)
	if len(runes) <= n {
		return s
	}
	return string(runes[:n]) + "..."
}
