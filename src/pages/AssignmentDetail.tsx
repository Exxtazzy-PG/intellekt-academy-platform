import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { uz } from "@/i18n/uz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Loader2, Megaphone, CheckCircle2, XCircle, Clock, Eye, Trophy } from "lucide-react";
import { toast } from "sonner";

interface Asg { id: string; title: string | null; test_id: string; questions_per_student: number; seconds_per_question: number; deadline: string | null; answers_published: boolean; }
interface SR {
  id: string; student_id: string; status: string; score: number; total: number; started_at: string | null; completed_at: string | null;
  profile?: { first_name: string | null; last_name: string | null; avatar_url: string | null };
}
interface QFull { id: string; question_text: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_option: string; }
interface SA { question_id: string; selected_option: string | null; is_correct: boolean; timed_out: boolean; time_taken_seconds: number | null; }

const AssignmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [asg, setAsg] = useState<Asg | null>(null);
  const [students, setStudents] = useState<SR[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // detail dialog
  const [openSid, setOpenSid] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QFull[]>([]);
  const [answers, setAnswers] = useState<SA[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data: a } = await supabase.from("test_assignments").select("*").eq("id", id).maybeSingle();
    setAsg(a as any);
    const { data: as } = await supabase.from("assignment_students").select("*").eq("assignment_id", id).order("created_at");
    const sids = (as ?? []).map((s) => s.student_id);
    const { data: profs } = sids.length
      ? await supabase.from("profiles").select("id, first_name, last_name, avatar_url").in("id", sids)
      : { data: [] as any[] };
    const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    setStudents((as ?? []).map((s: any) => ({ ...s, profile: pmap.get(s.student_id) })));
    setLoading(false);
  };

  useEffect(() => { load(); document.title = `${uz.assignmentsTitle} — ${uz.brand}`; }, [id]);

  const publish = async () => {
    if (!asg) return;
    if (!confirm(uz.publishConfirm)) return;
    setPublishing(true);
    const newVal = !asg.answers_published;
    const { error } = await supabase.from("test_assignments").update({ answers_published: newVal }).eq("id", asg.id);
    if (error) { setPublishing(false); return toast.error(error.message); }
    if (newVal) {
      // notify students
      const notifs = students.map((s) => ({
        user_id: s.student_id,
        type: "answers_published",
        title: uz.answersPublishedTitle,
        message: `${uz.answersPublishedMsg}: ${asg.title}`,
        link: `/my-assignments/${asg.id}`,
      }));
      if (notifs.length) await supabase.from("notifications").insert(notifs);
    }
    setAsg({ ...asg, answers_published: newVal });
    setPublishing(false);
    toast.success(uz.success);
  };

  const openDetail = async (sid: string) => {
    if (!asg) return;
    setOpenSid(sid);
    setDetailLoading(true);
    const { data: aqs } = await supabase.from("assignment_questions").select("question_id, position").eq("assignment_id", asg.id).eq("student_id", sid).order("position");
    const qids = (aqs ?? []).map((q) => q.question_id);
    const { data: qs } = qids.length ? await supabase.from("questions").select("*").in("id", qids) : { data: [] as any[] };
    const qmap = new Map((qs ?? []).map((q: any) => [q.id, q]));
    const ordered = (aqs ?? []).map((aq) => qmap.get(aq.question_id)).filter(Boolean);
    setQuestions(ordered as QFull[]);
    const { data: sa } = await supabase.from("student_answers").select("*").eq("assignment_id", asg.id).eq("student_id", sid);
    setAnswers(sa ?? []);
    setDetailLoading(false);
  };

  if (role !== "ustoz") return <div className="text-center py-20 text-muted-foreground">Faqat ustoz uchun</div>;
  if (loading || !asg) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const completed = students.filter((s) => s.status === "completed").length;
  const detailStudent = students.find((s) => s.student_id === openSid);
  const aMap = new Map(answers.map((a) => [a.question_id, a]));

  return (
    <div className="animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate("/assignments")} className="mb-4 -ml-3"><ArrowLeft className="h-4 w-4" />{uz.back}</Button>

      <Card className="p-6 bg-gradient-card border-0 shadow-elegant mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display font-bold text-2xl mb-1">{asg.title}</h1>
            <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
              <Badge variant="secondary">{asg.questions_per_student} {uz.questions}</Badge>
              <Badge variant="secondary">{asg.seconds_per_question}s/{uz.question.toLowerCase()}</Badge>
              <Badge variant="secondary">{completed}/{students.length} {uz.completed.toLowerCase()}</Badge>
            </div>
          </div>
          <Button variant={asg.answers_published ? "outline" : "hero"} onClick={publish} disabled={publishing}>
            {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
            <Megaphone className="h-4 w-4" />
            {asg.answers_published ? uz.unpublish : uz.publishAnswers}
          </Button>
        </div>
      </Card>

      <h2 className="font-display font-bold text-xl mb-4">{uz.studentsProgress}</h2>
      <div className="grid gap-3">
        {students.map((s) => {
          const pct = s.total ? Math.round((s.score / s.total) * 100) : 0;
          const initials = `${s.profile?.first_name?.[0] ?? ""}${s.profile?.last_name?.[0] ?? ""}`.toUpperCase() || "?";
          return (
            <Card key={s.id} className="p-4 bg-card border hover:shadow-card transition-all">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 ring-2 ring-accent/20">
                  <AvatarImage src={s.profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-gradient-ocean text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{s.profile?.first_name} {s.profile?.last_name}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {s.status === "completed" && <Badge className="bg-success/15 text-success border-success/30"><CheckCircle2 className="h-3 w-3" /> {uz.completed}</Badge>}
                    {s.status === "in_progress" && <Badge variant="secondary"><Clock className="h-3 w-3" /> {uz.inProgress}</Badge>}
                    {s.status === "pending" && <Badge variant="outline">{uz.pending}</Badge>}
                    {s.status === "expired" && <Badge variant="destructive">{uz.expired}</Badge>}
                  </div>
                </div>
                {s.status === "completed" && (
                  <div className="text-right">
                    <div className="font-display font-black text-2xl text-accent">{pct}%</div>
                    <div className="text-xs text-muted-foreground">{s.score}/{s.total}</div>
                  </div>
                )}
                <Button variant="soft" size="sm" onClick={() => openDetail(s.student_id)} disabled={s.status === "pending"}>
                  <Eye className="h-4 w-4" /> {uz.detailedAnswers}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!openSid} onOpenChange={(o) => !o && setOpenSid(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{detailStudent?.profile?.first_name} {detailStudent?.profile?.last_name} — {uz.detailedAnswers}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <ScrollArea className="max-h-[65vh] pr-4">
              <div className="space-y-3">
                {questions.map((q, idx) => {
                  const a = aMap.get(q.id);
                  const correct = q.correct_option;
                  return (
                    <Card key={q.id} className="p-4">
                      <div className="flex items-start gap-2 mb-3">
                        <span className="font-bold text-sm text-muted-foreground">{idx + 1}.</span>
                        <p className="font-medium text-sm flex-1">{q.question_text}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {(["a", "b", "c", "d"] as const).map((opt) => {
                          const isCorrect = opt === correct;
                          const isSelected = a?.selected_option === opt;
                          return (
                            <div key={opt} className={`p-2 rounded border ${
                              isCorrect ? "border-success bg-success/10" :
                              isSelected ? "border-destructive bg-destructive/10" : "border-border"
                            }`}>
                              <span className="font-bold uppercase mr-1">{opt}.</span>
                              {q[`option_${opt}` as keyof QFull] as string}
                              {isCorrect && <CheckCircle2 className="inline h-3 w-3 ml-1 text-success" />}
                              {isSelected && !isCorrect && <XCircle className="inline h-3 w-3 ml-1 text-destructive" />}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground flex gap-3">
                        {a?.timed_out && <Badge variant="destructive" className="text-[10px]">{uz.timedOut}</Badge>}
                        {!a?.selected_option && !a?.timed_out && <Badge variant="outline" className="text-[10px]">{uz.notAnswered}</Badge>}
                        {a?.time_taken_seconds != null && <span>⏱ {a.time_taken_seconds}s</span>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssignmentDetail;
