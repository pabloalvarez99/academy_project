package knowledge

// Category represents a top-level knowledge area.
type Category struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Count int    `json:"count"` // number of articles
}

// Article is a rendered knowledge-base article.
type Article struct {
	ID       string   `json:"id"`
	Title    string   `json:"title"`
	Category string   `json:"category"`
	Tags     []string `json:"tags"`
	Body     string   `json:"body"` // HTML rendered from Markdown
}
