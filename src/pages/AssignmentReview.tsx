import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { uz } from "@/i18n/uz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Trophy, CheckCircle2, XCircle } from "lucide-react";

interface Q { id: string; question_text: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_option: string; }
interface A { question_id: string; selected_option: string | null; is_correct: boolean; timed_out: boolean; }

const AssignmentReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [asg, setAsg] = useState<{ title: string | null; answers_published: boolean } | null>(null);
  const [score, setScore] = useState({ score: 0, total: 0 });
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<A[]>([]);

  useEffect(() => {
    if (!id || !user) return;
    document.title = `${uz.viewResult} — ${uz.brand}`;
    (async () => {
      const { data: a } = await supabase.from("test_assignments").select("title, answers_published").eq("id", id).maybeSingle();
      setAsg(a as any);
      const { data: as } = await supabase.from("assignment_students").select("score, total").eq("assignment_id", id).eq("student_id", user.id).maybeSingle();
      if (as) setScore({ score: as.score, total: as.total });
      const { data: aqs } = await supabase.from("assignment_questions").select("question_id, position").eq("assignment_id", id).eq("student_id", user.id).order("position");
      const qids = (aqs ?? []).map((q) => q.question_id);
      const { data: qs } = qids.length ? await supabase.from("questions").select("*").in("id", qids) : { data: [] as any[] };
      const qmap = new Map((qs ?? []).map((q: any) => [q.id, q]));
      setQuestions((aqs ?? []).map((aq) => qmap.get(aq.question_id)).filter(Boolean) as Q[]);
      const { data: sa } = await supabase.from("student_answers").select("*").eq("assignment_id", id).eq("student_id", user.id);
      setAnswers(sa ?? []);
      setLoading(false);
    })();
  }, [id, user?.id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!asg?.answers_published) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <p className="text-muted-foreground mb-4">{uz.waitingForResults}</p>
        <Button onClick={() => navigate("/my-assignments")}>{uz.back}</Button>
      </div>
    );
  }

  const aMap = new Map(answers.map((a) => [a.question_id, a]));
  const pct = score.total ? Math.round((score.score / score.total) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate("/my-assignments")} className="mb-4 -ml-3"><ArrowLeft className="h-4 w-4" />{uz.back}</Button>

      <Card className="p-8 mb-6 bg-gradient-card border-0 shadow-elegant text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow" />
        <div className="relative">
          <Trophy className="h-12 w-12 text-accent mx-auto mb-3" />
          <h1 className="font-display font-bold text-2xl mb-2">{asg.title}</h1>
          <div className="text-6xl font-display font-black text-gradient my-4">{pct}%</div>
          <p className="text-muted-foreground">{score.score} / {score.total} {uz.correct.toLowerCase()}</p>
        </div>
      </Card>

      <h2 className="font-display font-bold text-xl mb-4">{uz.reviewByQuestion}</h2>
      <div className="space-y-3">
        {questions.map((q, idx) => {
          const a = aMap.get(q.id);
          return (
            <Card key={q.id} className="p-5">
              <div className="flex items-start gap-2 mb-3">
                <span className="font-bold text-sm text-muted-foreground">{idx + 1}.</span>
                <p className="font-medium flex-1">{q.question_text}</p>
                {a?.is_correct ? <CheckCircle2 className="h-5 w-5 text-success shrink-0" /> : <XCircle className="h-5 w-5 text-destructive shrink-0" />}
              </div>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                {(["a", "b", "c", "d"] as const).map((opt) => {
                  const isCorrect = opt === q.correct_option;
                  const isSelected = a?.selected_option === opt;
                  return (
                    <div key={opt} className={`p-2.5 rounded border ${
                      isCorrect ? "border-success bg-success/10" :
                      isSelected ? "border-destructive bg-destructive/10" : "border-border"
                    }`}>
                      <span className="font-bold uppercase mr-1">{opt}.</span>
                      {q[`option_${opt}` as keyof Q] as string}
                      {isCorrect && <Badge className="ml-2 bg-success/20 text-success border-0 text-[10px]">{uz.correctAnswerWas}</Badge>}
                      {isSelected && !isCorrect && <Badge variant="destructive" className="ml-2 text-[10px]">{uz.yourAnswer}</Badge>}
                    </div>
                  );
                })}
              </div>
              {a?.timed_out && <Badge variant="destructive" className="mt-2 text-[10px]">{uz.timedOut}</Badge>}
              {!a?.selected_option && !a?.timed_out && <Badge variant="outline" className="mt-2 text-[10px]">{uz.notAnswered}</Badge>}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AssignmentReview;
