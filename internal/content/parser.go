package content

import (
	"bytes"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/renderer/html"
)

var md = goldmark.New(
	goldmark.WithExtensions(extension.GFM, extension.Table),
	goldmark.WithRendererOptions(html.WithHardWraps()),
)

// RenderMarkdown converts Markdown source to an HTML string.
func RenderMarkdown(source string) (string, error) {
	var buf bytes.Buffer
	if err := md.Convert([]byte(source), &buf); err != nil {
		return "", err
	}
	return buf.String(), nil
}
