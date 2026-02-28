package progress

// ModuleProgress holds aggregated progress for one user/module/category.
type ModuleProgress struct {
	Module    string  `json:"module"`
	Category  string  `json:"category"`
	Total     int     `json:"total"`
	Completed int     `json:"completed"`
	Passed    int     `json:"passed"`
	Percent   float64 `json:"percent"` // 0-100
}

// Achievement is an award a user can earn.
type Achievement struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	EarnedAt    int64  `json:"earnedAt,omitempty"` // Unix ms; 0 = not earned
	Earned      bool   `json:"earned"`
}

// UserStats is the full statistics snapshot for a user.
type UserStats struct {
	TotalAttempts  int              `json:"totalAttempts"`
	TotalPassed    int              `json:"totalPassed"`
	PassRate       float64          `json:"passRate"`
	ModuleProgress []ModuleProgress `json:"moduleProgress"`
	Achievements   []Achievement    `json:"achievements"`
}
