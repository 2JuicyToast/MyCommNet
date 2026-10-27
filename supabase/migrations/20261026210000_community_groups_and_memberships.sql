-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: 20261026210000_community_groups_and_memberships.sql
-- Description: Minimal, non-destructive migration for secure group counts and browsing
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Secure Aggregate Function for Group Member Counts
-- This function aggregates membership counts per group without exposing individual
-- user IDs or personal membership records to other users, preserving strict user privacy.
CREATE OR REPLACE FUNCTION public.get_group_member_counts()
RETURNS TABLE (
  group_id uuid,
  member_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    group_id,
    count(*)::bigint AS member_count
  FROM public.group_memberships
  GROUP BY group_id;
$$;

-- Grant execution to authenticated users and visitors
GRANT EXECUTE ON FUNCTION public.get_group_member_counts() TO anon, authenticated;

-- 2. Optional: Allow unauthenticated visitors to browse active groups
-- (If your policy already permits this, or if you prefer to restrict browsing to
-- signed-in users, this statement is safe to keep or omit.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'community_groups'
      AND policyname = 'Anyone can view active community groups'
  ) THEN
    CREATE POLICY "Anyone can view active community groups"
      ON public.community_groups
      FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
  END IF;
END $$;
