CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    lot_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(lot_id, author_id, target_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_id);
CREATE INDEX IF NOT EXISTS idx_reviews_lot ON reviews(lot_id);

CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY,
    author_id INTEGER NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id INTEGER NOT NULL,
    reason VARCHAR(100),
    message TEXT,
    status VARCHAR(20) DEFAULT 'new',
    admin_comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_target ON complaints(target_type, target_id);

CREATE TABLE IF NOT EXISTS favorite_lots (
    user_id INTEGER NOT NULL,
    lot_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, lot_id)
);

CREATE TABLE IF NOT EXISTS favorite_contractors (
    user_id INTEGER NOT NULL,
    contractor_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, contractor_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    category_id INTEGER,
    city VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, category_id, city)
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_cat_city ON subscriptions(category_id, city);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT,
    auth_key TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'none';
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_docs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_comment TEXT;

ALTER TABLE lots ADD COLUMN IF NOT EXISTS object_photos JSONB DEFAULT '[]'::jsonb;