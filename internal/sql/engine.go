package sqllab

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

// Engine executes SQL against isolated in-memory SQLite databases.
type Engine struct{}

// NewEngine creates a new SQL Engine.
func NewEngine() *Engine { return &Engine{} }

// RunQuery opens a fresh in-memory SQLite DB, applies the schema,
// then executes the query and returns the result.
func (e *Engine) RunQuery(schema, query string) QueryResult {
	db, err := sql.Open("sqlite", ":memory:?_foreign_keys=on")
	if err != nil {
		return QueryResult{Error: fmt.Sprintf("open db: %v", err)}
	}
	defer db.Close()

	// Apply schema statements
	if schema != "" {
		for _, stmt := range splitSQL(schema) {
			if _, err := db.Exec(stmt); err != nil {
				return QueryResult{Error: fmt.Sprintf("schema error: %v", err)}
			}
		}
	}

	start := time.Now()
	rows, err := db.Query(query)
	elapsed := time.Since(start).Milliseconds()
	if err != nil {
		return QueryResult{Error: err.Error(), TimeMs: elapsed}
	}
	defer rows.Close()

	cols, err := rows.Columns()
	if err != nil {
		return QueryResult{Error: fmt.Sprintf("columns: %v", err), TimeMs: elapsed}
	}

	var result [][]interface{}
	for rows.Next() {
		vals := make([]interface{}, len(cols))
		ptrs := make([]interface{}, len(cols))
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return QueryResult{Error: fmt.Sprintf("scan: %v", err), TimeMs: elapsed}
		}
		row := make([]interface{}, len(cols))
		for i, v := range vals {
			// Convert []byte to string for JSON serialization
			if b, ok := v.([]byte); ok {
				row[i] = string(b)
			} else {
				row[i] = v
			}
		}
		result = append(result, row)
	}
	if result == nil {
		result = [][]interface{}{}
	}
	return QueryResult{Columns: cols, Rows: result, TimeMs: elapsed}
}

// GetQueryPlan returns the EXPLAIN QUERY PLAN output for a query.
func (e *Engine) GetQueryPlan(schema, query string) string {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		return err.Error()
	}
	defer db.Close()
	if schema != "" {
		for _, s := range splitSQL(schema) {
			db.Exec(s)
		}
	}
	rows, err := db.Query("EXPLAIN QUERY PLAN " + query)
	if err != nil {
		return err.Error()
	}
	defer rows.Close()

	var plan strings.Builder
	for rows.Next() {
		var id, parent, notused int
		var detail string
		if err := rows.Scan(&id, &parent, &notused, &detail); err != nil {
			break
		}
		fmt.Fprintf(&plan, "%s\n", detail)
	}
	return strings.TrimSpace(plan.String())
}

// splitSQL splits a multi-statement SQL string on semicolons, skipping empty parts.
func splitSQL(s string) []string {
	parts := strings.Split(s, ";")
	var stmts []string
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			stmts = append(stmts, t)
		}
	}
	return stmts
}
