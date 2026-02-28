package db

import (
	_ "embed"
	"fmt"
	"time"
)

//go:embed migrations/001_init.sql
var migration001 string

// Migrate applies all pending database migrations in order.
func (d *DB) Migrate() error {
	// Ensure migration tracking table exists first
	_, err := d.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version    INTEGER PRIMARY KEY,
		applied_at INTEGER NOT NULL
	)`)
	if err != nil {
		return fmt.Errorf("create migrations table: %w", err)
	}

	migrations := []struct {
		version int
		sql     string
	}{
		{1, migration001},
	}

	for _, m := range migrations {
		var count int
		_ = d.QueryRow(`SELECT COUNT(*) FROM schema_migrations WHERE version = ?`, m.version).Scan(&count)
		if count > 0 {
			continue // already applied
		}
		if _, err := d.Exec(m.sql); err != nil {
			return fmt.Errorf("migration %d: %w", m.version, err)
		}
		_, _ = d.Exec(`INSERT INTO schema_migrations(version, applied_at) VALUES(?,?)`,
			m.version, time.Now().UnixMilli())
	}
	return nil
}
