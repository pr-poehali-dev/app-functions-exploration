
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'contractor', 'admin')),
    entity_type VARCHAR(20) CHECK (entity_type IN ('individual', 'legal', 'ip', 'self_employed')),
    full_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    inn VARCHAR(12),
    ogrn VARCHAR(15),
    city VARCHAR(100),
    region VARCHAR(100),
    address TEXT,
    avatar_url TEXT,
    about TEXT,
    specializations TEXT[],
    experience_years INT DEFAULT 0,
    portfolio JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb,
    rating NUMERIC(3,2) DEFAULT 0,
    reviews_count INT DEFAULT 0,
    deals_count INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Work categories
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    parent_id INT REFERENCES categories(id),
    sort_order INT DEFAULT 0
);

-- Lots (auction items)
CREATE TABLE lots (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    category_id INT REFERENCES categories(id),
    description TEXT,
    object_type VARCHAR(100),
    object_area NUMERIC(10,2),
    object_condition TEXT,
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    start_price NUMERIC(14,2) NOT NULL,
    current_min_bid NUMERIC(14,2),
    bid_step NUMERIC(14,2) DEFAULT 1000,
    work_start_date DATE,
    work_end_date DATE,
    work_duration_days INT,
    auction_end_at TIMESTAMP NOT NULL,
    auto_extend_minutes INT DEFAULT 0,
    payment_terms VARCHAR(50) CHECK (payment_terms IN ('prepaid', 'staged', 'on_completion')),
    materials_by VARCHAR(50) CHECK (materials_by IN ('customer', 'contractor', 'both')),
    warranty_months INT,
    additional_conditions TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    work_items JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'moderation', 'active', 'completed', 'cancelled', 'in_work', 'done')),
    views_count INT DEFAULT 0,
    bids_count INT DEFAULT 0,
    winner_id INT REFERENCES users(id),
    cancel_reason TEXT,
    decision_deadline TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bids (stakes by contractors)
CREATE TABLE bids (
    id SERIAL PRIMARY KEY,
    lot_id INT NOT NULL REFERENCES lots(id),
    contractor_id INT NOT NULL REFERENCES users(id),
    amount NUMERIC(14,2) NOT NULL,
    comment TEXT,
    is_auto BOOLEAN DEFAULT FALSE,
    auto_min_amount NUMERIC(14,2),
    is_withdrawn BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Reviews
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    lot_id INT NOT NULL REFERENCES lots(id),
    author_id INT NOT NULL REFERENCES users(id),
    target_id INT NOT NULL REFERENCES users(id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Messages (chat)
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    lot_id INT REFERENCES lots(id),
    sender_id INT NOT NULL REFERENCES users(id),
    receiver_id INT NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Favorites
CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    lot_id INT NOT NULL REFERENCES lots(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, lot_id)
);

-- Session tokens
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, slug, sort_order) VALUES
    ('Отделочные работы', 'otdelochnye', 1),
    ('Электромонтаж', 'elektromontazh', 2),
    ('Сантехника', 'santehnika', 3),
    ('Демонтажные работы', 'demontazh', 4),
    ('Кровельные работы', 'krovelnye', 5),
    ('Фасадные работы', 'fasadnye', 6),
    ('Благоустройство', 'blagoustrojstvo', 7),
    ('Общестроительные', 'obshchestroitelnye', 8),
    ('Проектирование', 'proektirovanie', 9),
    ('Другое', 'drugoe', 10);

-- Indexes
CREATE INDEX idx_lots_status ON lots(status);
CREATE INDEX idx_lots_customer ON lots(customer_id);
CREATE INDEX idx_lots_category ON lots(category_id);
CREATE INDEX idx_lots_auction_end ON lots(auction_end_at);
CREATE INDEX idx_bids_lot ON bids(lot_id);
CREATE INDEX idx_bids_contractor ON bids(contractor_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_messages_lot ON messages(lot_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
