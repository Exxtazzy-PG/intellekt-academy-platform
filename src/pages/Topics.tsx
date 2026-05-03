import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { uz } from "@/i18n/uz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Loader2, ChevronRight, Trash2, Pencil, Filter } from "lucide-react";
import { toast } from "sonner";

interface Topic {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  subject_id: string | null;
  created_at: string;
}
interface Subject { id: string; title: string; }

const NONE = "__none__";

const Topics = () => {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const subjectFilter = searchParams.get("subject") ?? "all";

  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Topic | null>(null);
  const [form, setForm] = useState({ title: "", description: "", content: "", subject_id: NONE });
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.title = `${uz.topicsTitle} — ${uz.brand}`; }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: s }] = await Promise.all([
      supabase.from("topics").select("*").order("created_at", { ascending: false }),
      supabase.from("subjects").select("id, title").order("title"),
    ]);
    setTopics(t ?? []);
    setSubjects(s ?? []);
    if (t && t.length) {
      const { data: tests } = await supabase.from("tests").select("topic_id").in("topic_id", t.map((x) => x.id));
      const m: Record<string, number> = {};
      (tests ?? []).forEach((x) => { m[x.topic_id] = (m[x.topic_id] ?? 0) + 1; });
      setCounts(m);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (subjectFilter === "all") return topics;
    if (subjectFilter === "none") return topics.filter((t) => !t.subject_id);
    return topics.filter((t) => t.subject_id === subjectFilter);
  }, [topics, subjectFilter]);

  const subjectMap = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s.title])), [subjects]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "", content: "", subject_id: subjectFilter !== "all" && subjectFilter !== "none" ? subjectFilter : NONE });
    setOpen(true);
  };

  const openEdit = (t: Topic) => {
    setEditing(t);
    setForm({ title: t.title, description: t.description ?? "", content: t.content ?? "", subject_id: t.subject_id ?? NONE });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim() || !user) return toast.error(uz.fillAllFields);
    setSaving(true);
    const payload = {
      title: form.title.trim().slice(0, 200),
      description: form.description.trim().slice(0, 1000) || null,
      content: form.content.trim() || null,
      subject_id: form.subject_id === NONE ? null : form.subject_id,
    };
    const { error } = editing
      ? await supabase.from("topics").update(payload).eq("id", editing.id)
      : await supabase.from("topics").insert({ ...payload, created_by: user.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(uz.success);
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(uz.confirm)) return;
    const { error } = await supabase.from("topics").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(uz.success);
    load();
  };

  const setFilter = (val: string) => {
    if (val === "all") setSearchParams({});
    else setSearchParams({ subject: val });
  };

  return (
    <div className="animate-fade-in-up">
      <header className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-accent" />
            </div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl">{uz.topicsTitle}</h1>
          </div>
          <p className="text-muted-foreground">{uz.topicsSubtitle}</p>
        </div>
        {role === "ustoz" && (
          <Button variant="hero" onClick={openCreate}><Plus /> {uz.newTopic}</Button>
        )}
      </header>

      {subjects.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Button variant={subjectFilter === "all" ? "default" : "soft"} size="sm" onClick={() => setFilter("all")}>{uz.allSubjects}</Button>
          {subjects.map((s) => (
            <Button key={s.id} variant={subjectFilter === s.id ? "default" : "soft"} size="sm" onClick={() => setFilter(s.id)}>{s.title}</Button>
          ))}
          <Button variant={subjectFilter === "none" ? "default" : "soft"} size="sm" onClick={() => setFilter("none")}>{uz.noSubject}</Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center bg-gradient-card">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">{uz.noTopics}</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t, i) => (
            <Card
              key={t.id}
              className="group relative p-6 bg-gradient-card border-0 shadow-card hover:shadow-elegant cursor-pointer transition-all hover:-translate-y-1 animate-scale-in overflow-hidden"
              style={{ animationDelay: `${i * 40}ms` }}
              onClick={() => navigate(`/topics/${t.id}`)}
            >
              <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-glow opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <BookOpen className="h-8 w-8 text-accent" />
                  {role === "ustoz" && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(t); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); remove(t.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
                {t.subject_id && subjectMap[t.subject_id] && (
                  <Badge variant="secondary" className="mb-2 text-xs">{subjectMap[t.subject_id]}</Badge>
                )}
                <h3 className="font-display font-bold text-lg mb-1 line-clamp-1">{t.title}</h3>
                {t.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{t.description}</p>}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">{counts[t.id] ?? 0} {uz.testsInTopic}</span>
                  <ChevronRight className="h-4 w-4 text-accent group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? uz.edit : uz.newTopic}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{uz.selectSubject}</Label>
              <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— {uz.noSubject} —</SelectItem>
                  {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{uz.topicTitle}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label>{uz.topicDescription}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>{uz.topicContent}</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder={uz.topicContentPlaceholder}
                rows={10}
                className="font-sans"
              />
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

export default Topics;
