-- Migration 002: Add school_levels to guru table
ALTER TABLE guru ADD COLUMN IF NOT EXISTS school_levels TEXT[] DEFAULT '{}';
