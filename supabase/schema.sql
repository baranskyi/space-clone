-- Space Clone Database Schema
-- Run this in Supabase SQL Editor

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Capture Sessions
CREATE TABLE public.capture_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'capturing'
    CHECK (status IN ('capturing', 'uploading', 'stitching', 'stitched', 'generating', 'done', 'failed')),
  photo_count INTEGER DEFAULT 0,
  photos_storage_path TEXT,
  panorama_storage_path TEXT,
  panorama_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.capture_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
  ON public.capture_sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_capture_sessions_user_id ON public.capture_sessions(user_id);

-- Worlds
CREATE TABLE public.worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.capture_sessions(id),
  world_labs_id TEXT UNIQUE,
  operation_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
  title TEXT NOT NULL DEFAULT 'Untitled Space',
  description TEXT,
  viewer_url TEXT,
  thumbnail_url TEXT,
  panorama_url TEXT,
  splat_url TEXT,
  mesh_url TEXT,
  is_public BOOLEAN DEFAULT false,
  share_slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own worlds"
  ON public.worlds FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public worlds"
  ON public.worlds FOR SELECT
  USING (is_public = true);

CREATE INDEX idx_worlds_user_id ON public.worlds(user_id);
CREATE INDEX idx_worlds_share_slug ON public.worlds(share_slug);
CREATE INDEX idx_worlds_status ON public.worlds(status);

-- Storage Buckets (run these separately in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('panoramas', 'panoramas', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true);
