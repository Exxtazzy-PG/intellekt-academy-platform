import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

/** Extracts the storage object path from either a stored path or a legacy public URL. */
export function avatarPath(value?: string | null): string | null {
  if (!value) return null;
  const clean = value.split("?")[0];
  const marker = "/avatars/";
  const idx = clean.indexOf(marker);
  const path = idx >= 0 ? clean.slice(idx + marker.length) : clean;
  return path.replace(/^\/+/, "") || null;
}

/** Returns a short-lived signed URL for a private avatar object. */
export async function signedAvatarUrl(value?: string | null): Promise<string | null> {
  const path = avatarPath(value);
  if (!path) return null;
  const cached = cache.get(path);
  if (cached) return cached;
  const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  cache.set(path, data.signedUrl);
  setTimeout(() => cache.delete(path), 55 * 60 * 1000);
  return data.signedUrl;
}

export function clearAvatarCache() {
  cache.clear();
}
