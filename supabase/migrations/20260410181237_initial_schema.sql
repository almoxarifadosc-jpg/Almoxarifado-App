-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED')),
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create operations table
CREATE TABLE IF NOT EXISTS operations (
  id TEXT PRIMARY KEY,
  line TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  date TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  steps JSONB DEFAULT '[]'::jsonb,
  icon_type TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create news_posts table
CREATE TABLE IF NOT EXISTS news_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT,
  text TEXT NOT NULL,
  author TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_posts ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone." ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile." ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policies for operations
CREATE POLICY "Operations are viewable by authenticated users." ON operations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Operations are insertable by authenticated users." ON operations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Operations are updatable by authenticated users." ON operations
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Operations are deletable by authenticated users." ON operations
  FOR DELETE USING (auth.role() = 'authenticated');

-- Policies for news_posts
CREATE POLICY "News posts are viewable by everyone." ON news_posts
  FOR SELECT USING (true);

CREATE POLICY "News posts are insertable by authenticated users." ON news_posts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "News posts are updatable by authenticated users." ON news_posts
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "News posts are deletable by authenticated users." ON news_posts
  FOR DELETE USING (auth.role() = 'authenticated');
