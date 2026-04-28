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
import { ArrowLeft, Plus, Loader2, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface Test { id: string; title: string; }
interface Question {
  id: string;
  test_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  position: number;
}

const empty = { question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "a" };

const TestEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: t }, { data: qs }] = await Promise.all([
      supabase.from("tests").select("id, title").eq("id", id).maybeSingle(),
      supabase.from("questions").select("*").eq("test_id", id).order("position", { ascending: true }),
    ]);
    setTest(t);
    setQuestions(qs ?? []);
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

  if (role !== "ustoz") return <div className="text-center py-20"><p className="text-muted-foreground">Faqat ustoz uchun</p></div>;
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="animate-fade-in-up max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-3"><ArrowLeft className="h-4 w-4" />{uz.back}</Button>

      <h1 className="font-display font-bold text-3xl mb-2">{test?.title}</h1>
      <p className="text-muted-foreground mb-8">{questions.length} {uz.questions}</p>

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
    </div>
  );
};

export default TestEdit;
