import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { uz } from "@/i18n/uz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Library, Plus, Loader2, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Subject {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  created_at: string;
}

const COLORS = [
  { name: "Ocean", value: "from-sky-500 to-blue-700" },
  { name: "Emerald", value: "from-emerald-500 to-teal-700" },
  { name: "Violet", value: "from-violet-500 to-purple-700" },
  { name: "Amber", value: "from-amber-500 to-orange-700" },
  { name: "Rose", value: "from-rose-500 to-pink-700" },
  { name: "Slate", value: "from-slate-500 to-slate-800" },
];

const Subjects = () => {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState({ title: "", description: "", color: COLORS[0].value });
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.title = `${uz.subjectsTitle} — ${uz.brand}`; }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("subjects").select("*").order("created_at", { ascending: false });
    setSubjects(data ?? []);
    if (data && data.length) {
      const { data: topics } = await supabase.from("topics").select("subject_id").in("subject_id", data.map((s) => s.id));
      const m: Record<string, number> = {};
      (topics ?? []).forEach((t) => { if (t.subject_id) m[t.subject_id] = (m[t.subject_id] ?? 0) + 1; });
      setCounts(m);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "", color: COLORS[0].value });
    setOpen(true);
  };

  const openEdit = (s: Subject) => {
    setEditing(s);
    setForm({ title: s.title, description: s.description ?? "", color: s.color ?? COLORS[0].value });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim() || !user) return toast.error(uz.fillAllFields);
    setSaving(true);
    const payload = {
      title: form.title.trim().slice(0, 200),
      description: form.description.trim().slice(0, 1000) || null,
      color: form.color,
    };
    const { error } = editing
      ? await supabase.from("subjects").update(payload).eq("id", editing.id)
      : await supabase.from("subjects").insert({ ...payload, created_by: user.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(uz.success);
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(uz.confirm)) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(uz.success);
    load();
  };

  return (
    <div className="animate-fade-in-up">
      <header className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center">
              <Library className="h-5 w-5 text-accent" />
            </div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl">{uz.subjectsTitle}</h1>
          </div>
          <p className="text-muted-foreground">{uz.subjectsSubtitle}</p>
        </div>
        {role === "ustoz" && <Button variant="hero" onClick={openCreate}><Plus /> {uz.newSubject}</Button>}
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : subjects.length === 0 ? (
        <Card className="p-12 text-center bg-gradient-card">
          <Library className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">{uz.noSubjects}</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s, i) => (
            <Card
              key={s.id}
              className="group relative p-0 border-0 shadow-card hover:shadow-elegant cursor-pointer transition-all hover:-translate-y-1 animate-scale-in overflow-hidden"
              style={{ animationDelay: `${i * 40}ms` }}
              onClick={() => navigate(`/topics?subject=${s.id}`)}
            >
              <div className={cn("h-32 bg-gradient-to-br relative", s.color ?? COLORS[0].value)}>
                <Library className="absolute bottom-3 right-3 h-16 w-16 text-white/20" />
                {role === "ustoz" && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/30 hover:bg-black/50 text-white" onClick={(e) => { e.stopPropagation(); openEdit(s); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/30 hover:bg-black/50 text-white" onClick={(e) => { e.stopPropagation(); remove(s.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="p-5 bg-card">
                <h3 className="font-display font-bold text-lg mb-1 line-clamp-1">{s.title}</h3>
                {s.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{s.description}</p>}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">{counts[s.id] ?? 0} {uz.topicsInSubject}</span>
                  <ChevronRight className="h-4 w-4 text-accent group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? uz.edit : uz.newSubject}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>{uz.subjectName}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} /></div>
            <div className="space-y-1.5"><Label>{uz.subjectDescription}</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} rows={3} /></div>
            <div className="space-y-1.5">
              <Label>{uz.subjectColor}</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm({ ...form, color: c.value })}
                    className={cn("h-10 w-10 rounded-lg bg-gradient-to-br ring-offset-background transition-all", c.value, form.color === c.value && "ring-2 ring-ring ring-offset-2 scale-110")}
                    aria-label={c.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{uz.cancel}</Button>
            <Button variant="hero" onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? uz.save : uz.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subjects;
