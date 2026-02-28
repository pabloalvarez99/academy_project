package progress

import (
	"time"

	"github.com/google/uuid"

	"github.com/eks/eks/internal/db"
)

// Service handles progress tracking and achievement granting.
type Service struct {
	db *db.DB
}

// NewService creates a progress Service.
func NewService(database *db.DB) *Service {
	return &Service{db: database}
}

// RecordAttempt records a completed exercise attempt and updates aggregate progress.
func (s *Service) RecordAttempt(userID, exerciseID, module, language, status, code, output string, score int, timeMs int64) error {
	now := time.Now().UnixMilli()
	_, err := s.db.Exec(
		`INSERT INTO attempts(id,user_id,exercise_id,module,language,started_at,completed_at,status,score,time_ms,code_input,output)
		 VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
		uuid.New().String(), userID, exerciseID, module, language,
		now, now, status, score, timeMs, code, output,
	)
	if err != nil {
		return err
	}

	// category = language for programming, module name for others
	cat := language
	if cat == "" {
		cat = module
	}
	passedInt := 0
	if status == "passed" {
		passedInt = 1
	}
	s.db.Exec(`
		INSERT INTO progress(user_id,module,category,total,completed,passed,last_updated)
		VALUES(?,?,?,1,1,?,?)
		ON CONFLICT(user_id,module,category) DO UPDATE SET
			completed = completed + 1,
			passed    = passed + excluded.passed,
			last_updated = excluded.last_updated`,
		userID, module, cat, passedInt, now,
	)

	s.checkAndGrant(userID, module, language, status)
	return nil
}

// GetStats returns the full statistics snapshot for a user.
func (s *Service) GetStats(userID string) (*UserStats, error) {
	stats := &UserStats{}

	s.db.QueryRow(
		`SELECT COUNT(*), COALESCE(SUM(CASE WHEN status='passed' THEN 1 ELSE 0 END),0)
		 FROM attempts WHERE user_id=?`, userID,
	).Scan(&stats.TotalAttempts, &stats.TotalPassed)

	if stats.TotalAttempts > 0 {
		stats.PassRate = float64(stats.TotalPassed) / float64(stats.TotalAttempts) * 100
	}

	rows, err := s.db.Query(
		`SELECT module, category, total, completed, passed FROM progress WHERE user_id=?`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var mp ModuleProgress
		rows.Scan(&mp.Module, &mp.Category, &mp.Total, &mp.Completed, &mp.Passed)
		if mp.Total > 0 {
			mp.Percent = float64(mp.Passed) / float64(mp.Total) * 100
		}
		stats.ModuleProgress = append(stats.ModuleProgress, mp)
	}
	if stats.ModuleProgress == nil {
		stats.ModuleProgress = []ModuleProgress{}
	}

	stats.Achievements = s.ListAchievements(userID)
	return stats, nil
}

// ListAchievements returns all achievements with earned status for a user.
func (s *Service) ListAchievements(userID string) []Achievement {
	earned := make(map[string]int64)
	rows, _ := s.db.Query(`SELECT achievement_id, earned_at FROM achievements WHERE user_id=?`, userID)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var id string
			var at int64
			rows.Scan(&id, &at)
			earned[id] = at
		}
	}
	result := make([]Achievement, len(achievementDefs))
	for i, def := range achievementDefs {
		a := def
		if ts, ok := earned[def.ID]; ok {
			a.Earned = true
			a.EarnedAt = ts
		}
		result[i] = a
	}
	return result
}
