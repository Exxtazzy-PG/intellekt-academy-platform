import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { uz } from "@/i18n/uz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Trophy, Clock, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface Q {
  id: string; question_text: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
  correct_option: string;
}

const AssignmentTake = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [asg, setAsg] = useState<{ id: string; title: string | null; seconds_per_question: number; deadline: string | null; created_by: string } | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [savedCount, setSavedCount] = useState(0); // how many answers saved
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState({ score: 0, total: 0 });
  const startedRef = useRef<number>(Date.now());
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!id || !user) return;
    document.title = `${uz.startTest} — ${uz.brand}`;
    (async () => {
      const { data: a } = await supabase.from("test_assignments").select("id, title, seconds_per_question, deadline, created_by").eq("id", id).maybeSingle();
      if (!a) { toast.error(uz.notFound); navigate("/my-assignments"); return; }
      // expired?
      if (a.deadline && new Date(a.deadline) < new Date()) {
        await supabase.from("assignment_students").update({ status: "expired" }).eq("assignment_id", id).eq("student_id", user.id);
        toast.error(uz.cantStartExpired);
        navigate("/my-assignments");
        return;
      }
      // already completed?
      const { data: as } = await supabase.from("assignment_students").select("status").eq("assignment_id", id).eq("student_id", user.id).maybeSingle();
      if (as?.status === "completed") {
        toast.error(uz.alreadyCompleted);
        navigate("/my-assignments");
        return;
      }
      // load assigned questions
      const { data: aqs } = await supabase.from("assignment_questions").select("question_id, position").eq("assignment_id", id).eq("student_id", user.id).order("position");
      const qids = (aqs ?? []).map((q) => q.question_id);
      const { data: qs } = qids.length ? await supabase.from("questions").select("*").in("id", qids) : { data: [] as any[] };
      const qmap = new Map((qs ?? []).map((q: any) => [q.id, q]));
      const ordered = (aqs ?? []).map((aq) => qmap.get(aq.question_id)).filter(Boolean) as Q[];
      // restore previously saved answers count
      const { data: sa } = await supabase.from("student_answers").select("question_id").eq("assignment_id", id).eq("student_id", user.id);
      const answeredIds = new Set((sa ?? []).map((s) => s.question_id));
      const startIndex = ordered.findIndex((q) => !answeredIds.has(q.id));
      setQuestions(ordered);
      setAsg(a);
      setTimeLeft(a.seconds_per_question);
      setCurrent(startIndex === -1 ? ordered.length : startIndex);
      setSavedCount(answeredIds.size);
      // mark in_progress
      await supabase.from("assignment_students").update({
        status: "in_progress",
        started_at: as?.status === "pending" ? new Date().toISOString() : undefined,
        total: ordered.length,
      }).eq("assignment_id", id).eq("student_id", user.id);
      setLoading(false);
      startedRef.current = Date.now();
    })();
  }, [id, user?.id]);

  // Timer
  useEffect(() => {
    if (loading || finished || !asg || current >= questions.length) return;
    setTimeLeft(asg.seconds_per_question);
    setSelected(null);
    startedRef.current = Date.now();
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          handleNext(true); // timeout
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, loading, finished]);

  const handleNext = async (timedOut: boolean) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    if (!asg || !user || !id) return;
    const q = questions[current];
    if (!q) { submittingRef.current = false; return; }
    const timeTaken = Math.min(asg.seconds_per_question, Math.round((Date.now() - startedRef.current) / 1000));
    const isCorrect = !timedOut && selected === q.correct_option;
    await supabase.from("student_answers").insert({
      assignment_id: id,
      student_id: user.id,
      question_id: q.id,
      selected_option: timedOut ? null : selected,
      is_correct: isCorrect,
      timed_out: timedOut,
      time_taken_seconds: timedOut ? asg.seconds_per_question : timeTaken,
    });
    const newSaved = savedCount + 1;
    setSavedCount(newSaved);
    if (current + 1 >= questions.length) {
      // finish
      const { data: sa } = await supabase.from("student_answers").select("is_correct").eq("assignment_id", id).eq("student_id", user.id);
      const score = (sa ?? []).filter((a) => a.is_correct).length;
      const total = questions.length;
      await supabase.from("assignment_students").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        score,
        total,
      }).eq("assignment_id", id).eq("student_id", user.id);
      // Notify teacher that student finished
      if (asg.created_by) {
        const { data: prof } = await supabase.from("profiles").select("first_name, last_name").eq("id", user.id).maybeSingle();
        const fullName = `${prof?.first_name ?? ""} ${prof?.last_name ?? ""}`.trim() || "Talaba";
        await supabase.from("notifications").insert({
          user_id: asg.created_by,
          type: "student_finished",
          title: "Talaba testni yakunladi",
          message: `${fullName} — ${asg.title ?? ""}`,
          link: `/assignments/${id}`,
        });
      }
      setFinalScore({ score, total });
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
    }
    submittingRef.current = false;
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (questions.length === 0) {
    return <div className="text-center py-20"><p className="text-muted-foreground mb-4">{uz.noQuestions}</p>
      <Button onClick={() => navigate("/my-assignments")}>{uz.back}</Button></div>;
  }

  if (finished) {
    return (
      <div className="max-w-2xl mx-auto animate-scale-in">
        <Card className="p-6 sm:p-10 text-center bg-gradient-card border-0 shadow-elegant relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-glow" />
          <div className="relative">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-ocean flex items-center justify-center mx-auto mb-6 shadow-glow animate-glow-pulse">
              <Trophy className="h-10 w-10 sm:h-12 sm:w-12 text-primary-foreground" />
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl mb-2">{uz.testFinished}</h1>
            <p className="text-base sm:text-lg text-muted-foreground my-4">{uz.waitingForResults}</p>
            <p className="text-sm text-muted-foreground mb-8">
              {finalScore.total} {uz.questions} • {new Date().toLocaleString()}
            </p>
            <Button variant="hero" onClick={() => navigate("/my-assignments")}>{uz.back}</Button>
          </div>
        </Card>
      </div>
    );
  }

  const q = questions[current];
  const progress = ((current) / questions.length) * 100;
  const timePercent = (timeLeft / (asg?.seconds_per_question ?? 60)) * 100;
  const lowTime = timeLeft <= 10;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 gap-3">
          <h1 className="font-display font-bold text-xl md:text-2xl truncate">{asg?.title}</h1>
          <span className="text-sm text-muted-foreground font-medium shrink-0">{uz.question} {current + 1} / {questions.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Timer */}
      <Card className={`p-3 mb-4 border-2 ${lowTime ? "border-destructive bg-destructive/5 animate-pulse" : "border-accent/30"}`}>
        <div className="flex items-center gap-3">
          <Clock className={`h-5 w-5 ${lowTime ? "text-destructive" : "text-accent"}`} />
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold">{uz.timeLeft}</span>
              <span className={`font-bold ${lowTime ? "text-destructive" : ""}`}>{timeLeft}s</span>
            </div>
            <Progress value={timePercent} className={`h-1.5 ${lowTime ? "[&>div]:bg-destructive" : ""}`} />
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-7 md:p-8 bg-gradient-card border-0 shadow-elegant mb-6">
        <h2 className="font-display font-semibold text-lg sm:text-xl md:text-2xl mb-5 sm:mb-6 leading-snug">{q.question_text}</h2>
        <div className="space-y-2.5 sm:space-y-3">
          {(["a", "b", "c", "d"] as const).map((opt) => {
            const isSel = selected === opt;
            return (
              <button
                key={opt}
                onClick={() => setSelected(opt)}
                className={`w-full text-left p-3 sm:p-4 rounded-2xl border-2 transition-all duration-200 flex items-center gap-3 sm:gap-4 group active:scale-[0.99] ${
                  isSel ? "border-accent bg-accent/10 shadow-glow" : "border-border hover:border-accent/50 hover:bg-accent/5"
                }`}
              >
                <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl font-display font-bold uppercase flex items-center justify-center transition-colors shrink-0 ${
                  isSel ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground group-hover:bg-accent/20"
                }`}>{opt}</div>
                <span className="flex-1 font-medium text-sm sm:text-base">{q[`option_${opt}` as keyof Q] as string}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="hero" size="lg" onClick={() => handleNext(false)} disabled={!selected}>
          {current < questions.length - 1 ? <>{uz.next} <ArrowRight className="h-4 w-4" /></> : uz.finish}
        </Button>
      </div>
    </div>
  );
};

export default AssignmentTake;
