import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { uz } from "@/i18n/uz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings as SettingsIcon, Sun, Moon, Camera, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { document.title = `${uz.settingsTitle} — ${uz.brand}`; }, []);

  useEffect(() => {
    setFirstName(profile?.first_name ?? "");
    setLastName(profile?.last_name ?? "");
  }, [profile]);

  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      first_name: firstName.trim().slice(0, 50),
      last_name: lastName.trim().slice(0, 50),
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(uz.profileUpdated);
    refreshProfile();
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${publicUrl}?v=${Date.now()}`;
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success(uz.profileUpdated);
    refreshProfile();
  };

  return (
    <div className="animate-fade-in-up max-w-3xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center"><SettingsIcon className="h-5 w-5 text-accent" /></div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl">{uz.settingsTitle}</h1>
        </div>
      </header>

      {/* Personal info */}
      <Card className="p-6 md:p-8 bg-gradient-card border-0 shadow-card mb-6">
        <h2 className="font-display font-bold text-xl mb-6">{uz.personalInfo}</h2>
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-4 ring-accent/20">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-gradient-ocean text-primary-foreground text-2xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <Button variant="soft" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Camera className="h-4 w-4" />{profile?.avatar_url ? uz.changeAvatar : uz.uploadAvatar}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
            />
            <p className="text-xs text-muted-foreground mt-2">JPG, PNG (max 5MB)</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{uz.firstName}</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={50} />
          </div>
          <div className="space-y-1.5">
            <Label>{uz.lastName}</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={50} />
          </div>
        </div>
        <Button variant="hero" onClick={save} disabled={saving} className="mt-6">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{uz.save}
        </Button>
      </Card>

      {/* Appearance */}
      <Card className="p-6 md:p-8 bg-gradient-card border-0 shadow-card">
        <h2 className="font-display font-bold text-xl mb-6">{uz.appearance}</h2>
        <Label className="mb-3 block">{uz.theme}</Label>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <button
            onClick={() => setTheme("light")}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
              theme === "light" ? "border-accent bg-accent/10 shadow-glow" : "border-border hover:border-accent/50"
            }`}
          >
            <Sun className="h-6 w-6 text-warning" />
            <span className="font-medium">{uz.light}</span>
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
              theme === "dark" ? "border-accent bg-accent/10 shadow-glow" : "border-border hover:border-accent/50"
            }`}
          >
            <Moon className="h-6 w-6 text-primary-glow" />
            <span className="font-medium">{uz.dark}</span>
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
