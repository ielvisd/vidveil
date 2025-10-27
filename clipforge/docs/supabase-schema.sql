-- ClipForge Supabase Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clips table
CREATE TABLE IF NOT EXISTS clips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  src TEXT NOT NULL,
  start_time NUMERIC DEFAULT 0,
  end_time NUMERIC,
  duration NUMERIC,
  track INTEGER DEFAULT 0,
  pip_config JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PiP configurations table
CREATE TABLE IF NOT EXISTS pip_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  shape_type TEXT NOT NULL DEFAULT 'circle',
  shape_path TEXT,
  shape_params JSONB DEFAULT '{}'::jsonb,
  position JSONB DEFAULT '{"x": 0, "y": 0}',
  animations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE pip_configs ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Clips policies
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

-- PiP configs policies
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS clips_project_id_idx ON clips(project_id);
CREATE INDEX IF NOT EXISTS pip_configs_clip_id_idx ON pip_configs(clip_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clips_updated_at
  BEFORE UPDATE ON clips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pip_configs_updated_at
  BEFORE UPDATE ON pip_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
