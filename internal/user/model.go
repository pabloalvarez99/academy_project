package user

// User represents an EKS user profile.
type User struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	Avatar      string `json:"avatar"`
	CreatedAt   int64  `json:"createdAt"`
	LastActive  int64  `json:"lastActive"`
	Settings    string `json:"settings"`
}

// CreateUserRequest is the payload for creating a new user profile.
type CreateUserRequest struct {
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	PIN         string `json:"pin"`    // optional; empty = no PIN required
	Avatar      string `json:"avatar"` // emoji key or "default"
}
