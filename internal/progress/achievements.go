package progress

import "time"

// achievementDefs is the canonical list of all EKS achievements.
var achievementDefs = []Achievement{
	{ID: "first_pass",    Title: "First Blood",        Description: "Pass your first exercise",                      Icon: "🎯"},
	{ID: "go_first",      Title: "Gopher",              Description: "Pass a Go exercise",                            Icon: "🐹"},
	{ID: "rust_first",    Title: "Rustacean",           Description: "Pass a Rust exercise",                          Icon: "🦀"},
	{ID: "py_first",      Title: "Pythonista",          Description: "Pass a Python exercise",                        Icon: "🐍"},
	{ID: "ts_first",      Title: "Type Safety",         Description: "Pass a TypeScript exercise",                    Icon: "📘"},
	{ID: "sql_first",     Title: "Query Master",        Description: "Pass a SQL exercise",                           Icon: "🗄️"},
	{ID: "grammar_first", Title: "Wordsmith",           Description: "Pass a grammar exercise",                       Icon: "📝"},
	{ID: "pass_10",       Title: "Getting Started",     Description: "Pass 10 exercises total",                       Icon: "🌱"},
	{ID: "pass_50",       Title: "Committed",           Description: "Pass 50 exercises total",                       Icon: "🌿"},
	{ID: "pass_100",      Title: "Centurion",           Description: "Pass 100 exercises total",                      Icon: "🏆"},
	{ID: "all_languages", Title: "Polyglot",            Description: "Pass at least one exercise in all 7 languages", Icon: "🌍"},
	{ID: "perfect_score", Title: "Perfectionist",       Description: "Score 100 on 10 different exercises",           Icon: "💎"},
}

// checkAndGrant evaluates which achievements the user has newly earned
// and inserts them into the DB. Called after every attempt.
func (s *Service) checkAndGrant(userID, module, language, status string) {
	if status != "passed" {
		return
	}

	// Count total passes
	var totalPassed int
	s.db.QueryRow(`SELECT COUNT(*) FROM attempts WHERE user_id=? AND status='passed'`, userID).Scan(&totalPassed)

	now := time.Now().UnixMilli()

	// Language-specific first-pass achievements
	langAchievement := map[string]string{
		"go": "go_first", "rust": "rust_first", "python": "py_first",
		"typescript": "ts_first", "sql": "sql_first",
	}
	if module == "grammar" {
		s.grantIfNew(userID, "grammar_first", now)
	}
	if id, ok := langAchievement[language]; ok {
		s.grantIfNew(userID, id, now)
	}

	// Volume achievements
	if totalPassed >= 1 {
		s.grantIfNew(userID, "first_pass", now)
	}
	if totalPassed >= 10 {
		s.grantIfNew(userID, "pass_10", now)
	}
	if totalPassed >= 50 {
		s.grantIfNew(userID, "pass_50", now)
	}
	if totalPassed >= 100 {
		s.grantIfNew(userID, "pass_100", now)
	}

	// Polyglot: passed at least one in each of the 7 languages
	if s.hasPassedAllLanguages(userID) {
		s.grantIfNew(userID, "all_languages", now)
	}
}

func (s *Service) grantIfNew(userID, achievementID string, earnedAt int64) {
	s.db.Exec(
		`INSERT OR IGNORE INTO achievements(user_id, achievement_id, earned_at) VALUES(?,?,?)`,
		userID, achievementID, earnedAt,
	)
}

func (s *Service) hasPassedAllLanguages(userID string) bool {
	var count int
	s.db.QueryRow(`
		SELECT COUNT(DISTINCT COALESCE(language,''))
		FROM attempts
		WHERE user_id=? AND status='passed'
		  AND language IN ('go','rust','python','typescript','java','c','cpp')`,
		userID,
	).Scan(&count)
	return count >= 7
}
