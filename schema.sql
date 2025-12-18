CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('support', 'staff-application')),
  data JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE,
  ai_review JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_type ON submissions(type);
CREATE INDEX IF NOT EXISTS idx_submissions_read ON submissions(read);
CREATE INDEX IF NOT EXISTS idx_submissions_timestamp ON submissions(timestamp DESC);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON submissions
  FOR ALL
  USING (true)
  WITH CHECK (true);

