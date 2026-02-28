package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

// DB wraps sql.DB with EKS-specific helpers.
type DB struct {
	*sql.DB
}

// Open opens (or creates) the EKS SQLite database at dataDir/users.db.
// WAL mode is enabled for better concurrent read performance.
func Open(dataDir string) (*DB, error) {
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}
	path := filepath.Join(dataDir, "users.db")
	dsn := path + "?_journal_mode=WAL&_foreign_keys=on&_busy_timeout=5000"
	sqlDB, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	sqlDB.SetMaxOpenConns(1) // SQLite: single writer, avoid SQLITE_BUSY
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}
	return &DB{sqlDB}, nil
}

// DataDir returns the default EKS data directory (~/.eks/data).
func DataDir() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".eks", "data")
}
