package embedcontent

import "embed"

// FS holds all content files embedded at build time.
// The content/ directory is at the project root, sibling to this package.
//
//go:embed all:content
var FS embed.FS
