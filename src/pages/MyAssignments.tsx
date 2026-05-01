import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { uz } from "@/i18n/uz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Inbox, Loader2, Play, Clock, CheckCircle2, AlertTriangle, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Row {
  id: string; status: string; score: number; total: number;
  assignment: { id: string; title: string | null; deadline: string | null; questions_per_student: number; seconds_per_question: number; answers_published: boolean; created_at: string };
}

const MyAssignments = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `${uz.myAssignmentsTitle} — ${uz.brand}`;
    if (!user) return;
    (async () => {
      const { data: as } = await supabase
        .from("assignment_students")
        .select("id, status, score, total, assignment_id")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });
      const ids = (as ?? []).map((a) => a.assignment_id);
      const { data: asg } = ids.length ? await supabase.from("test_assignments").select("*").in("id", ids) : { data: [] as any[] };
      const m = new Map((asg ?? []).map((a: any) => [a.id, a]));
      setRows((as ?? []).map((a: any) => ({ ...a, assignment: m.get(a.assignment_id) })).filter((r) => r.assignment));
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <div className="animate-fade-in-up">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center"><Inbox className="h-5 w-5 text-accent" /></div>
          <h1 className="font-display font-bold text-3xl md:text-4xl">{uz.myAssignmentsTitle}</h1>
        </div>
        <p className="text-muted-foreground">{uz.myAssignmentsSubtitle}</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center bg-gradient-card">
          <Inbox className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">{uz.noAssignments}</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((r, i) => {
            const a = r.assignment;
            const expired = a.deadline && new Date(a.deadline) < new Date();
            const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;
            const isCompleted = r.status === "completed";
            const isExpired = r.status === "expired" || (expired && r.status === "pending");
            return (
              <Card key={r.id} className="p-6 bg-gradient-card border-0 shadow-card hover:shadow-elegant transition-all hover:-translate-y-1 animate-scale-in" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-bold text-lg truncate">{a.title}</h3>
                    <div className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</div>
                  </div>
                  {isCompleted ? (
                    <Badge className="bg-success/15 text-success border-success/30"><CheckCircle2 className="h-3 w-3" /> {uz.completed}</Badge>
                  ) : isExpired ? (
                    <Badge variant="destructive"><AlertTriangle className="h-3 w-3" /> {uz.expired}</Badge>
                  ) : (
                    <Badge variant="secondary"><Clock className="h-3 w-3" /> {uz.pending}</Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                  <div className="bg-muted/50 rounded p-2 text-center">
                    <div className="font-bold text-base">{a.questions_per_student}</div>
                    <div className="text-muted-foreground">{uz.questions}</div>
                  </div>
                  <div className="bg-muted/50 rounded p-2 text-center">
                    <div className="font-bold text-base">{a.seconds_per_question}s</div>
                    <div className="text-muted-foreground">/savol</div>
                  </div>
                  <div className="bg-muted/50 rounded p-2 text-center">
                    {isCompleted ? (
                      <><div className="font-bold text-base text-accent">{pct}%</div><div className="text-muted-foreground">Ball</div></>
                    ) : (
                      <><div className="font-bold text-base">{a.deadline ? new Date(a.deadline).toLocaleDateString() : "∞"}</div><div className="text-muted-foreground">Muddat</div></>
                    )}
                  </div>
                </div>

                {isCompleted ? (
                  a.answers_published ? (
                    <Button asChild variant="hero" className="w-full"><Link to={`/my-assignments/${a.id}`}><Eye className="h-4 w-4" /> {uz.viewResult}</Link></Button>
                  ) : (
                    <div className="text-center text-xs text-muted-foreground italic py-2">{uz.waitingForResults}</div>
                  )
                ) : isExpired ? (
                  <Button disabled variant="outline" className="w-full">{uz.cantStartExpired}</Button>
                ) : (
                  <Button asChild variant="hero" className="w-full"><Link to={`/my-assignments/${a.id}/take`}><Play className="h-4 w-4" /> {r.status === "in_progress" ? uz.continueAssignment : uz.startAssignment}</Link></Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyAssignments;
