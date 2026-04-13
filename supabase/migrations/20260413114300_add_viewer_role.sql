-- Add new columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allowed_groups TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_viewer BOOLEAN DEFAULT FALSE;

-- Add production_lines table if it doesn't exist
CREATE TABLE IF NOT EXISTS production_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for new tables
ALTER TABLE production_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policies for production_lines
CREATE POLICY "Production lines are viewable by authenticated users." ON production_lines
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Production lines are manageable by admins." ON production_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Policies for settings
CREATE POLICY "Settings are viewable by authenticated users." ON settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Settings are manageable by admins." ON settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
