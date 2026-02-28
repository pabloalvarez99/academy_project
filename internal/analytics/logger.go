package analytics

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/eks/eks/internal/db"
)

// Logger records structured analytics events to the local SQLite database.
type Logger struct {
	db     *db.DB
	userID string
}

// NewLogger creates a Logger for a specific user.
// If userID is empty, logging is a no-op.
func NewLogger(database *db.DB, userID string) *Logger {
	return &Logger{db: database, userID: userID}
}

// SetUser updates the user ID associated with this logger.
func (l *Logger) SetUser(userID string) {
	l.userID = userID
}

// Log writes an event to the events table. Silently swallows errors.
func (l *Logger) Log(eventType string, payload interface{}) {
	if l.userID == "" || l.db == nil {
		return
	}
	data, _ := json.Marshal(payload)
	l.db.Exec(
		`INSERT INTO events(id, user_id, event_type, payload, occurred_at) VALUES(?,?,?,?,?)`,
		uuid.New().String(), l.userID, eventType, string(data), time.Now().UnixMilli(),
	)
}

// --- Convenience event methods ---

// AppStart records that the application was opened.
func (l *Logger) AppStart() { l.Log("app_start", nil) }

// ModuleOpen records that the user opened a module.
func (l *Logger) ModuleOpen(module string) {
	l.Log("module_open", map[string]string{"module": module})
}

// ExerciseStart records that a user started an exercise.
func (l *Logger) ExerciseStart(id, module string) {
	l.Log("exercise_start", map[string]string{"id": id, "module": module})
}

// ExerciseComplete records the outcome of an exercise attempt.
func (l *Logger) ExerciseComplete(id string, passed bool, score int, timeMs int64) {
	l.Log("exercise_complete", map[string]interface{}{
		"id":     id,
		"passed": passed,
		"score":  score,
		"timeMs": timeMs,
	})
}

// Search records a search query and its result count.
func (l *Logger) Search(query string, resultCount int) {
	l.Log("search", map[string]interface{}{
		"query":   query,
		"results": resultCount,
	})
}

// PageView records a navigation event.
func (l *Logger) PageView(page string) {
	l.Log("page_view", map[string]string{"page": page})
}
