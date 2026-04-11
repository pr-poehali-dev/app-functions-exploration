ALTER TABLE users ADD COLUMN IF NOT EXISTS rating_points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_monthly_bonus_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_bonus_awarded BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_rating_points ON users(rating_points DESC);
CREATE INDEX IF NOT EXISTS idx_users_role_rating ON users(role, rating_points DESC) WHERE role = 'contractor';