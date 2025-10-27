-- ClipForge Supabase Schema
-- Tables for projects, clips, and PiP configurations

-- Projects table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clips table
CREATE TABLE clips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  src TEXT NOT NULL,
  start_time REAL DEFAULT 0,
  end_time REAL,
  track INTEGER DEFAULT 0,
  pip_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PiP configs table
CREATE TABLE pip_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clip_id UUID REFERENCES clips(id) ON DELETE CASCADE,
  shape_type TEXT NOT NULL,
  shape_path TEXT,
  position JSONB DEFAULT '{"x": 0, "y": 0}',
  animations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_clips_project_id ON clips(project_id);
CREATE INDEX idx_pip_configs_clip_id ON pip_configs(clip_id);

-- Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE pip_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for clips
CREATE POLICY "Users can view clips in their projects"
  ON clips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = clips.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create clips in their projects"
  ON clips FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = clips.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update clips in their projects"
  ON clips FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = clips.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete clips in their projects"
  ON clips FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = clips.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- RLS Policies for pip_configs
CREATE POLICY "Users can view pip configs in their projects"
  ON pip_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clips
      JOIN projects ON projects.id = clips.project_id
      WHERE clips.id = pip_configs.clip_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create pip configs in their projects"
  ON pip_configs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clips
      JOIN projects ON projects.id = clips.project_id
      WHERE clips.id = pip_configs.clip_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update pip configs in their projects"
  ON pip_configs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clips
      JOIN projects ON projects.id = clips.project_id
      WHERE clips.id = pip_configs.clip_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete pip configs in their projects"
  ON pip_configs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clips
      JOIN projects ON projects.id = clips.project_id
      WHERE clips.id = pip_configs.clip_id
      AND projects.user_id = auth.uid()
    )
  );

