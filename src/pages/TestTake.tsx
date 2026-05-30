import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { uz } from "@/i18n/uz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Trophy, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  question_text: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
  correct_option: string;
}

const TestTake = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [testTitle, setTestTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: t }, { data: qs }] = await Promise.all([
        supabase.from("tests").select("title").eq("id", id).maybeSingle(),
        supabase.from("questions").select("*").eq("test_id", id).order("position", { ascending: true }),
      ]);
      setTestTitle(t?.title ?? "");
      document.title = `${t?.title ?? uz.startTest} — ${uz.brand}`;
      setQuestions(qs ?? []);
      setLoading(false);
    })();
  }, [id]);

  const select = (qid: string, opt: string) => setAnswers({ ...answers, [qid]: opt });

  const finish = async () => {
    if (!user || !id) return;
    setSubmitting(true);
    const sc = questions.reduce((s, q) => s + (answers[q.id] === q.correct_option ? 1 : 0), 0);
    setScore(sc);
    const payload = questions.map((q) => ({ question_id: q.id, selected: answers[q.id] ?? null, correct: q.correct_option }));
    const { error } = await supabase.from("attempts").insert({
      test_id: id,
      student_id: user.id,
      score: sc,
      total: questions.length,
      answers: payload,
      finished_at: new Date().toISOString(),
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
    setFinished(true);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (questions.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">{uz.noQuestions}</p>
        <Button onClick={() => navigate("/tests")}>{uz.backToTests}</Button>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-2xl mx-auto animate-scale-in">
        <Card className="p-10 text-center bg-gradient-card border-0 shadow-elegant relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-glow" />
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-gradient-ocean flex items-center justify-center mx-auto mb-6 shadow-glow animate-glow-pulse">
              <Trophy className="h-12 w-12 text-primary-foreground" />
            </div>
            <h1 className="font-display font-black text-4xl mb-2">{uz.yourScore}</h1>
            <div className="text-7xl font-display font-black text-gradient my-6">{pct}%</div>
            <p className="text-xl text-muted-foreground mb-8">{score} / {questions.length} {uz.correct}</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button variant="outline" onClick={() => navigate("/tests")}>{uz.backToTests}</Button>
              <Button variant="hero" onClick={() => { setFinished(false); setCurrent(0); setAnswers({}); setScore(0); }}>
                <Sparkles className="h-4 w-4" />{uz.retake}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const q = questions[current];
  const selected = answers[q.id];
  const progress = ((current + 1) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-3"><ArrowLeft className="h-4 w-4" />{uz.back}</Button>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display font-bold text-2xl">{testTitle}</h1>
          <span className="text-sm text-muted-foreground font-medium">{uz.question} {current + 1} {uz.of} {questions.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="p-5 sm:p-7 md:p-8 bg-gradient-card border-0 shadow-elegant mb-6">
        <h2 className="font-display font-semibold text-lg sm:text-xl md:text-2xl mb-5 sm:mb-6 leading-snug">{q.question_text}</h2>
        <div className="space-y-2.5 sm:space-y-3">
          {(["a", "b", "c", "d"] as const).map((opt) => {
            const isSel = selected === opt;
            return (
              <button
                key={opt}
                onClick={() => select(q.id, opt)}
                className={`w-full text-left p-3 sm:p-4 rounded-2xl border-2 transition-all duration-200 flex items-center gap-3 sm:gap-4 group active:scale-[0.99] ${
                  isSel ? "border-accent bg-accent/10 shadow-glow" : "border-border hover:border-accent/50 hover:bg-accent/5"
                }`}
              >
                <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl font-display font-bold uppercase flex items-center justify-center transition-colors shrink-0 ${
                  isSel ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground group-hover:bg-accent/20"
                }`}>{opt}</div>
                <span className="flex-1 font-medium text-sm sm:text-base">{q[`option_${opt}` as keyof Question] as string}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex gap-3 justify-between">
        <Button variant="outline" onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}>
          <ArrowLeft className="h-4 w-4" />{uz.back}
        </Button>
        {current < questions.length - 1 ? (
          <Button variant="hero" onClick={() => setCurrent(current + 1)} disabled={!selected}>{uz.next}</Button>
        ) : (
          <Button variant="hero" onClick={finish} disabled={!selected || submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}{uz.finish}
          </Button>
        )}
      </div>
    </div>
  );
};

export default TestTake;
