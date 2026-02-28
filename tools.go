//go:build tools

// Package main holds build-time tool dependencies so that go mod tidy
// does not remove them before they are used in implementation tasks.
package main

import (
	_ "github.com/blevesearch/bleve/v2"
	_ "github.com/google/uuid"
	_ "github.com/yuin/goldmark"
	_ "golang.org/x/crypto/bcrypt"
	_ "gopkg.in/yaml.v3"
	_ "modernc.org/sqlite"
)
