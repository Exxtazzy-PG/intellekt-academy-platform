import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { uz } from "@/i18n/uz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ClipboardList, Loader2, Eye, Trash2, CheckCircle2, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface AsgRow {
  id: string;
  title: string | null;
  test_id: string;
  questions_per_student: number;
  seconds_per_question: number;
  deadline: string | null;
  answers_published: boolean;
  created_at: string;
  total_students: number;
  completed: number;
}

const Assignments = () => {
  const { role } = useAuth();
  const [rows, setRows] = useState<AsgRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: asg } = await supabase.from("test_assignments").select("*").order("created_at", { ascending: false });
    const ids = (asg ?? []).map((a) => a.id);
    let counts: Record<string, { total: number; completed: number }> = {};
    if (ids.length) {
      const { data: as } = await supabase.from("assignment_students").select("assignment_id, status").in("assignment_id", ids);
      (as ?? []).forEach((a) => {
        if (!counts[a.assignment_id]) counts[a.assignment_id] = { total: 0, completed: 0 };
        counts[a.assignment_id].total += 1;
        if (a.status === "completed") counts[a.assignment_id].completed += 1;
      });
    }
    setRows((asg ?? []).map((a) => ({
      ...a,
      total_students: counts[a.id]?.total ?? 0,
      completed: counts[a.id]?.completed ?? 0,
    })));
    setLoading(false);
  };

  useEffect(() => {
    document.title = `${uz.assignmentsTitle} — ${uz.brand}`;
    load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm(uz.confirm)) return;
    const { error } = await supabase.from("test_assignments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(uz.success);
    load();
  };

  if (role !== "ustoz") return <div className="text-center py-20 text-muted-foreground">Faqat ustoz uchun</div>;

  return (
    <div className="animate-fade-in-up">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center"><ClipboardList className="h-5 w-5 text-accent" /></div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl">{uz.assignmentsTitle}</h1>
        </div>
        <p className="text-muted-foreground">{uz.assignmentsSubtitle}</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center bg-gradient-card">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">{uz.noAssignments}</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((a, i) => {
            const pct = a.total_students ? Math.round((a.completed / a.total_students) * 100) : 0;
            const expired = a.deadline && new Date(a.deadline) < new Date();
            return (
              <Card key={a.id} className="p-6 bg-gradient-card border-0 shadow-card hover:shadow-elegant animate-scale-in" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-bold text-lg truncate">{a.title}</h3>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {a.answers_published ? (
                      <Badge className="bg-success/15 text-success border-success/30"><CheckCircle2 className="h-3 w-3" /> {uz.answersPublished}</Badge>
                    ) : (
                      <Badge variant="secondary"><Clock className="h-3 w-3" /> {expired ? uz.expired : uz.inProgress}</Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="bg-muted/50 rounded p-2 text-center">
                    <div className="font-bold text-base">{a.questions_per_student}</div>
                    <div className="text-muted-foreground">{uz.questions}</div>
                  </div>
                  <div className="bg-muted/50 rounded p-2 text-center">
                    <div className="font-bold text-base">{a.seconds_per_question}s</div>
                    <div className="text-muted-foreground">/savol</div>
                  </div>
                  <div className="bg-muted/50 rounded p-2 text-center">
                    <div className="font-bold text-base flex items-center justify-center gap-1"><Users className="h-3 w-3" />{a.total_students}</div>
                    <div className="text-muted-foreground">{uz.talaba}</div>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{uz.completed}: {a.completed}/{a.total_students}</span>
                    <span className="font-semibold">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="hero" className="flex-1"><Link to={`/assignments/${a.id}`}><Eye className="h-4 w-4" /> {uz.view}</Link></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(a.id)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Assignments;
