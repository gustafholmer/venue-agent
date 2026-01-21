CREATE TABLE user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('favorite', 'dismiss', 'feedback')),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX idx_interactions_user ON user_interactions(user_id);
CREATE INDEX idx_interactions_listing ON user_interactions(listing_id);

-- Enable RLS
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

-- Users can manage own interactions
CREATE POLICY "Users can view own interactions" ON user_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions" ON user_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own interactions" ON user_interactions
  FOR DELETE USING (auth.uid() = user_id);
