package user

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/eks/eks/internal/db"
)

// Service manages EKS user profiles.
type Service struct {
	db *db.DB
}

// NewService creates a new user Service.
func NewService(database *db.DB) *Service {
	return &Service{db: database}
}

// CreateUser creates a new user profile.
func (s *Service) CreateUser(req CreateUserRequest) (*User, error) {
	if req.Username == "" || req.DisplayName == "" {
		return nil, fmt.Errorf("username and display name are required")
	}
	pinHash, err := hashPIN(req.PIN)
	if err != nil {
		return nil, fmt.Errorf("hash pin: %w", err)
	}
	avatar := req.Avatar
	if avatar == "" {
		avatar = "default"
	}
	u := &User{
		ID:          uuid.New().String(),
		Username:    req.Username,
		DisplayName: req.DisplayName,
		Avatar:      avatar,
		CreatedAt:   time.Now().UnixMilli(),
	}
	_, err = s.db.Exec(
		`INSERT INTO users(id, username, display_name, pin_hash, avatar, created_at)
		 VALUES(?, ?, ?, ?, ?, ?)`,
		u.ID, u.Username, u.DisplayName, pinHash, u.Avatar, u.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert user: %w", err)
	}
	return u, nil
}

// ListUsers returns all users ordered by most recently active.
func (s *Service) ListUsers() ([]User, error) {
	rows, err := s.db.Query(
		`SELECT id, username, display_name, avatar, created_at, COALESCE(last_active, 0)
		 FROM users ORDER BY COALESCE(last_active, 0) DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Username, &u.DisplayName, &u.Avatar, &u.CreatedAt, &u.LastActive); err != nil {
			return nil, err
		}
		u.Settings = "{}"
		users = append(users, u)
	}
	if users == nil {
		users = []User{} // never return nil slice to JSON
	}
	return users, nil
}

// AuthenticateUser validates credentials and returns the user, updating last_active.
func (s *Service) AuthenticateUser(username, pin string) (*User, error) {
	var u User
	var pinHash string
	err := s.db.QueryRow(
		`SELECT id, username, display_name, avatar, created_at, COALESCE(last_active,0), pin_hash
		 FROM users WHERE username = ?`, username,
	).Scan(&u.ID, &u.Username, &u.DisplayName, &u.Avatar, &u.CreatedAt, &u.LastActive, &pinHash)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("query user: %w", err)
	}
	if !checkPIN(pin, pinHash) {
		return nil, fmt.Errorf("invalid PIN")
	}
	now := time.Now().UnixMilli()
	_, _ = s.db.Exec(`UPDATE users SET last_active = ? WHERE id = ?`, now, u.ID)
	u.LastActive = now
	u.Settings = "{}"
	return &u, nil
}
