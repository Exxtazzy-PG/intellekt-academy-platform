import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { uz } from "@/i18n/uz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileQuestion, Plus, Loader2, Play, Pencil, Trash2, BookOpenText } from "lucide-react";
import { toast } from "sonner";

interface Topic { id: string; title: string; description: string | null; content: string | null; }
interface Test { id: string; title: string; description: string | null; created_at: string; }

const TopicDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: t }, { data: ts }] = await Promise.all([
      supabase.from("topics").select("*").eq("id", id).maybeSingle(),
      supabase.from("tests").select("*").eq("topic_id", id).order("created_at", { ascending: false }),
    ]);
    setTopic(t);
    setTests(ts ?? []);
    if (ts && ts.length) {
      const { data: qs } = await supabase.from("questions").select("test_id").in("test_id", ts.map((x) => x.id));
      const m: Record<string, number> = {};
      (qs ?? []).forEach((q) => { m[q.test_id] = (m[q.test_id] ?? 0) + 1; });
      setQuestionCounts(m);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { if (topic) document.title = `${topic.title} — ${uz.brand}`; }, [topic]);

  const create = async () => {
    if (!form.title.trim() || !user || !id) return toast.error(uz.fillAllFields);
    setSaving(true);
    const { error } = await supabase.from("tests").insert({
      topic_id: id,
      title: form.title.trim().slice(0, 200),
      description: form.description.trim().slice(0, 1000) || null,
      created_by: user.id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(uz.success);
    setOpen(false);
    setForm({ title: "", description: "" });
    load();
  };

  const remove = async (testId: string) => {
    if (!confirm(uz.confirm)) return;
    const { error } = await supabase.from("tests").delete().eq("id", testId);
    if (error) return toast.error(error.message);
    load();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!topic) return <div className="text-center py-20"><p className="text-muted-foreground">{uz.notFound}</p></div>;

  return (
    <div className="animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate("/topics")} className="mb-4 -ml-3">
        <ArrowLeft className="h-4 w-4" /> {uz.back}
      </Button>

      <Card className="p-8 bg-gradient-hero text-primary-foreground mb-8 relative overflow-hidden border-0 shadow-elegant">
        <div className="absolute inset-0 bg-gradient-glow opacity-50" />
        <div className="relative">
          <h1 className="font-display font-black text-3xl md:text-4xl mb-2">{topic.title}</h1>
          {topic.description && <p className="text-primary-foreground/80 max-w-2xl">{topic.description}</p>}
        </div>
      </Card>

      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-2xl">{uz.tests}</h2>
        {role === "ustoz" && <Button variant="hero" onClick={() => setOpen(true)}><Plus /> {uz.newTest}</Button>}
      </div>

      {tests.length === 0 ? (
        <Card className="p-12 text-center bg-gradient-card">
          <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">{uz.noQuestions}</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tests.map((t, i) => (
            <Card key={t.id} className="p-6 bg-gradient-card border-0 shadow-card hover:shadow-elegant transition-all animate-scale-in" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                  <FileQuestion className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-lg">{t.title}</h3>
                  {t.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{t.description}</p>}
                  <Badge variant="secondary" className="mt-2">{questionCounts[t.id] ?? 0} {uz.questions}</Badge>
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                {role === "talaba" && (questionCounts[t.id] ?? 0) > 0 && (
                  <Button asChild variant="hero" className="flex-1"><Link to={`/tests/${t.id}/take`}><Play className="h-4 w-4" /> {uz.startTest}</Link></Button>
                )}
                {role === "ustoz" && (
                  <>
                    <Button asChild variant="soft" className="flex-1"><Link to={`/tests/${t.id}/edit`}><Pencil className="h-4 w-4" /> {uz.edit}</Link></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{uz.newTest}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>{uz.testTitle}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} /></div>
            <div className="space-y-1.5"><Label>{uz.testDescription}</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{uz.cancel}</Button>
            <Button variant="hero" onClick={create} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} {uz.create}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TopicDetail;
