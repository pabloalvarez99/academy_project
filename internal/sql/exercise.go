package sqllab

import "fmt"

// compareResults returns true if two QueryResults have identical columns and rows.
func compareResults(a, b QueryResult) bool {
	if len(a.Columns) != len(b.Columns) {
		return false
	}
	if len(a.Rows) != len(b.Rows) {
		return false
	}
	for i := range a.Rows {
		if len(a.Rows[i]) != len(b.Rows[i]) {
			return false
		}
		for j := range a.Rows[i] {
			if fmt.Sprint(a.Rows[i][j]) != fmt.Sprint(b.Rows[i][j]) {
				return false
			}
		}
	}
	return true
}
