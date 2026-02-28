package knowledge

import (
	"io/fs"
	"path/filepath"
	"strings"

	"github.com/eks/eks/embedcontent"
	"github.com/eks/eks/internal/content"
)

// Service provides access to the IT knowledge base.
type Service struct{}

// NewService creates a knowledge base Service.
func NewService() *Service { return &Service{} }

// ListCategories returns all available knowledge categories.
func (s *Service) ListCategories() ([]Category, error) {
	entries, err := fs.ReadDir(embedcontent.FS, "content/knowledge")
	if err != nil {
		return nil, err
	}
	var cats []Category
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		count := countArticles(e.Name())
		cats = append(cats, Category{
			ID:    e.Name(),
			Title: toTitle(e.Name()),
			Count: count,
		})
	}
	if cats == nil {
		cats = []Category{}
	}
	return cats, nil
}

// ListArticles returns article IDs for a given category.
func (s *Service) ListArticles(category string) ([]string, error) {
	var articles []string
	_ = content.WalkDir("knowledge/"+category, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil || d.IsDir() {
			return nil
		}
		if strings.HasSuffix(path, ".md") {
			name := strings.TrimSuffix(filepath.Base(path), ".md")
			articles = append(articles, name)
		}
		return nil
	})
	if articles == nil {
		articles = []string{}
	}
	return articles, nil
}

// GetArticle loads and renders a knowledge article as HTML.
func (s *Service) GetArticle(category, id string) (*Article, error) {
	raw, err := content.ReadFile("knowledge/" + category + "/" + id + ".md")
	if err != nil {
		return nil, err
	}
	body, err := content.RenderMarkdown(string(raw))
	if err != nil {
		return nil, err
	}
	return &Article{
		ID:       id,
		Title:    extractTitle(string(raw)),
		Category: category,
		Body:     body,
	}, nil
}

func toTitle(slug string) string {
	slug = strings.ReplaceAll(slug, "-", " ")
	slug = strings.ReplaceAll(slug, "_", " ")
	words := strings.Fields(slug)
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(w[:1]) + w[1:]
		}
	}
	return strings.Join(words, " ")
}

func extractTitle(md string) string {
	for _, line := range strings.Split(md, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "# ") {
			return strings.TrimPrefix(line, "# ")
		}
	}
	return "Untitled"
}

func countArticles(category string) int {
	count := 0
	content.WalkDir("knowledge/"+category, func(path string, d fs.DirEntry, _ error) error {
		if !d.IsDir() && strings.HasSuffix(path, ".md") {
			count++
		}
		return nil
	})
	return count
}
