import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { uz } from "@/i18n/uz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Loader2, Trash2, Save, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";

interface Test { id: string; title: string; topic_id: string; }
interface Topic { id: string; title: string; content: string | null; }
interface Question {
  id: string;
  test_id: string;
  question_text: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
  correct_option: string;
  position: number;
}

const empty = { question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "a" };

const TestEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [test, setTest] = useState<Test | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [adding, setAdding] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiCount, setAiCount] = useState(10);
  const [aiExtra, setAiExtra] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data: t } = await supabase.from("tests").select("id, title, topic_id").eq("id", id).maybeSingle();
    setTest(t as any);
    const [{ data: qs }, topicRes] = await Promise.all([
      supabase.from("questions").select("*").eq("test_id", id).order("position", { ascending: true }),
      t?.topic_id ? supabase.from("topics").select("id, title, content").eq("id", t.topic_id).maybeSingle() : Promise.resolve({ data: null } as any),
    ]);
    setQuestions(qs ?? []);
    setTopic((topicRes as any).data ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { if (test) document.title = `${test.title} — ${uz.edit}`; }, [test]);

  const addQuestion = async () => {
    if (!form.question_text || !form.option_a || !form.option_b || !form.option_c || !form.option_d) {
      return toast.error(uz.fillAllFields);
    }
    if (!id) return;
    setAdding(true);
    const { error } = await supabase.from("questions").insert({
      test_id: id,
      question_text: form.question_text.trim().slice(0, 1000),
      option_a: form.option_a.trim().slice(0, 500),
      option_b: form.option_b.trim().slice(0, 500),
      option_c: form.option_c.trim().slice(0, 500),
      option_d: form.option_d.trim().slice(0, 500),
      correct_option: form.correct_option,
      position: questions.length,
    });
    setAdding(false);
    if (error) return toast.error(error.message);
    setForm(empty);
    toast.success(uz.success);
    load();
  };

  const remove = async (qid: string) => {
    if (!confirm(uz.confirm)) return;
    const { error } = await supabase.from("questions").delete().eq("id", qid);
    if (error) return toast.error(error.message);
    load();
  };

  const generateWithAi = async () => {
    if (!topic) return toast.error("Mavzu topilmadi");
    if (!topic.content || topic.content.trim().length < 20) {
      return toast.error("Avval mavzuga material qo'shing (kamida 20 ta belgi)");
    }
    const n = Math.max(1, Math.min(1000, Number(aiCount) || 10));
    setAiBusy(true);
    const tId = toast.loading(`AI ${n} ta savol yaratmoqda...`);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-questions", {
        body: { topicTitle: topic.title, topicContent: topic.content, count: n, extraInstructions: aiExtra },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const generated: any[] = (data as any)?.questions ?? [];
      if (!generated.length) throw new Error("AI hech qanday savol qaytarmadi");

      const startPos = questions.length;
      const rows = generated.map((q, i) => ({
        test_id: id!,
        question_text: String(q.question_text || "").slice(0, 1000),
        option_a: String(q.option_a || "").slice(0, 500),
        option_b: String(q.option_b || "").slice(0, 500),
        option_c: String(q.option_c || "").slice(0, 500),
        option_d: String(q.option_d || "").slice(0, 500),
        correct_option: ["a","b","c","d"].includes(q.correct_option) ? q.correct_option : "a",
        position: startPos + i,
      }));
      // Insert in chunks of 100
      for (let i = 0; i < rows.length; i += 100) {
        const { error: ie } = await supabase.from("questions").insert(rows.slice(i, i + 100));
        if (ie) throw ie;
      }
      toast.dismiss(tId);
      toast.success(`${rows.length} ta savol qo'shildi`);
      setAiOpen(false);
      setAiExtra("");
      load();
    } catch (e: any) {
      toast.dismiss(tId);
      toast.error(e?.message || "Xatolik");
    } finally {
      setAiBusy(false);
    }
  };

  if (role !== "ustoz") return <div className="text-center py-20"><p className="text-muted-foreground">Faqat ustoz uchun</p></div>;
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="animate-fade-in-up max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-3"><ArrowLeft className="h-4 w-4" />{uz.back}</Button>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl mb-1">{test?.title}</h1>
          <p className="text-muted-foreground">{questions.length} {uz.questions}</p>
        </div>
        <Button variant="hero" onClick={() => setAiOpen(true)} className="shadow-glow">
          <Sparkles className="h-4 w-4" /> AI yordamida yaratish
        </Button>
      </div>

      <div className="space-y-3 mb-8">
        {questions.map((q, i) => (
          <Card key={q.id} className="p-5 bg-gradient-card border-0 shadow-card animate-fade-in-up">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-accent/15 text-accent font-bold flex items-center justify-center shrink-0">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold mb-3">{q.question_text}</p>
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  {(["a", "b", "c", "d"] as const).map((opt) => (
                    <div key={opt} className={`px-3 py-2 rounded-lg border ${q.correct_option === opt ? "border-accent bg-accent/10 text-accent-foreground font-medium" : "border-border"}`}>
                      <span className="font-bold uppercase mr-2">{opt}.</span>{q[`option_${opt}` as keyof Question] as string}
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 bg-gradient-card border-0 shadow-elegant">
        <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2"><Plus className="h-5 w-5 text-accent" />{uz.addQuestion}</h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{uz.questionText}</Label>
            <Textarea value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} maxLength={1000} rows={2} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {(["a", "b", "c", "d"] as const).map((opt) => (
              <div key={opt} className="space-y-1.5">
                <Label>{uz[`option${opt.toUpperCase()}` as "optionA"]}</Label>
                <Input
                  value={form[`option_${opt}` as "option_a"]}
                  onChange={(e) => setForm({ ...form, [`option_${opt}`]: e.target.value })}
                  maxLength={500}
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label>{uz.correctAnswer}</Label>
            <RadioGroup value={form.correct_option} onValueChange={(v) => setForm({ ...form, correct_option: v })} className="flex gap-4">
              {(["a", "b", "c", "d"] as const).map((opt) => (
                <div key={opt} className="flex items-center gap-2">
                  <RadioGroupItem value={opt} id={`r-${opt}`} />
                  <Label htmlFor={`r-${opt}`} className="uppercase font-bold cursor-pointer">{opt}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <Button variant="hero" onClick={addQuestion} disabled={adding} className="w-full">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {uz.save}
          </Button>
        </div>
      </Card>

      <Dialog open={aiOpen} onOpenChange={(o) => !aiBusy && setAiOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-accent" /> AI bilan savollar yaratish</DialogTitle>
            <DialogDescription>
              Mavzu materiali asosida AI avtomatik test savollarini yaratadi. Mavzu: <b>{topic?.title}</b>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(!topic?.content || topic.content.trim().length < 20) && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                Bu mavzuda yetarli material yo'q. Avval mavzuga ma'lumot qo'shing.
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Savollar soni (1–1000)</Label>
              <Input type="number" min={1} max={1000} value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))} />
              <div className="flex flex-wrap gap-2 pt-1">
                {[10, 25, 50, 100, 250, 500, 1000].map((n) => (
                  <Button key={n} type="button" variant="soft" size="sm" onClick={() => setAiCount(n)}>{n}</Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Qo'shimcha ko'rsatma (ixtiyoriy)</Label>
              <Textarea
                value={aiExtra}
                onChange={(e) => setAiExtra(e.target.value)}
                placeholder="Masalan: oson darajada, faqat ta'riflar bo'yicha, hisob-kitob savollarisiz..."
                rows={3}
                maxLength={500}
              />
            </div>
            {aiCount > 100 && (
              <p className="text-xs text-muted-foreground">⚠️ Ko'p savol yaratish bir necha daqiqa olishi mumkin.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiOpen(false)} disabled={aiBusy}>{uz.cancel}</Button>
            <Button variant="hero" onClick={generateWithAi} disabled={aiBusy || !topic?.content}>
              {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Yaratish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestEdit;
