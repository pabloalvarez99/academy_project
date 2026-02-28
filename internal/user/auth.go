package user

import "golang.org/x/crypto/bcrypt"

// hashPIN returns a bcrypt hash of the PIN, or "" if PIN is empty.
func hashPIN(pin string) (string, error) {
	if pin == "" {
		return "", nil
	}
	b, err := bcrypt.GenerateFromPassword([]byte(pin), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// checkPIN returns true if pin matches hash, or if hash is empty (no PIN set).
func checkPIN(pin, hash string) bool {
	if hash == "" {
		return true
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pin)) == nil
}
