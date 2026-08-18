-- Rename current_password_hash → new_password_hash (more accurate: stores bcrypt hash of new password, not current)
ALTER TABLE pending_changes RENAME COLUMN current_password_hash TO new_password_hash;
