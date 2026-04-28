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
import { BookOpen, Plus, Loader2, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Topic {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

const Topics = () => {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = `${uz.topicsTitle} — ${uz.brand}`;
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("topics").select("*").order("created_at", { ascending: false });
    setTopics(data ?? []);
    if (data && data.length) {
      const { data: tests } = await supabase.from("tests").select("topic_id").in("topic_id", data.map((t) => t.id));
      const map: Record<string, number> = {};
      (tests ?? []).forEach((t) => { map[t.topic_id] = (map[t.topic_id] ?? 0) + 1; });
      setCounts(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.title.trim() || !user) return toast.error(uz.fillAllFields);
    setSaving(true);
    const { error } = await supabase.from("topics").insert({
      title: form.title.trim().slice(0, 200),
      description: form.description.trim().slice(0, 1000) || null,
      created_by: user.id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(uz.success);
    setDialogOpen(false);
    setForm({ title: "", description: "" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(uz.confirm)) return;
    const { error } = await supabase.from("topics").delete().eq("id", id);
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
              <BookOpen className="h-5 w-5 text-accent" />
            </div>
            <h1 className="font-display font-bold text-3xl md:text-4xl">{uz.topicsTitle}</h1>
          </div>
          <p className="text-muted-foreground">{uz.topicsSubtitle}</p>
        </div>
        {role === "ustoz" && (
          <Button variant="hero" onClick={() => setDialogOpen(true)}>
            <Plus /> {uz.newTopic}
          </Button>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : topics.length === 0 ? (
        <Card className="p-12 text-center bg-gradient-card">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">{uz.noTopics}</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {topics.map((t, i) => (
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); remove(t.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{uz.newTopic}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{uz.topicTitle}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label>{uz.topicDescription}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{uz.cancel}</Button>
            <Button variant="hero" onClick={create} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {uz.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Topics;
