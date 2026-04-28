
-- Fix function search_path
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- Revoke EXECUTE on SECURITY DEFINER functions from public/anon
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Restrict avatar listing: users can list only their own folder; public SELECT only for direct access via known path
DROP POLICY "Avatar images are publicly accessible" ON storage.objects;

CREATE POLICY "Avatars: public read by direct path"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
