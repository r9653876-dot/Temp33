-- 0004_add_likes_and_matches.sql

CREATE TABLE IF NOT EXISTS likes (
    id TEXT PRIMARY KEY,
    liker_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    liked_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(liker_user_id, liked_user_id)
);

CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_a_id, user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_liked_user_id ON likes(liked_user_id);
CREATE INDEX IF NOT EXISTS idx_likes_liker_user_id ON likes(liker_user_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_a_id ON matches(user_a_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_b_id ON matches(user_b_id);
