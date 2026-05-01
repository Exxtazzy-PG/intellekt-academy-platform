import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { uz } from "@/i18n/uz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, FileQuestion, TrendingUp, ArrowRight, ClipboardList, Inbox, Library, Trophy } from "lucide-react";

const Index = () => {
  const { profile, role, user } = useAuth();
  const [stats, setStats] = useState({ students: 0, subjects: 0, topics: 0, tests: 0, assignments: 0, completed: 0 });
  const [pending, setPending] = useState<any[]>([]);

  useEffect(() => {
    document.title = `${uz.dashboard} — ${uz.brand}`;
    if (!user) return;
    (async () => {
      if (role === "ustoz") {
        const [s, su, t, te, asg, comp] = await Promise.all([
          supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "talaba"),
          supabase.from("subjects").select("id", { count: "exact", head: true }),
          supabase.from("topics").select("id", { count: "exact", head: true }),
          supabase.from("tests").select("id", { count: "exact", head: true }),
          supabase.from("test_assignments").select("id", { count: "exact", head: true }),
          supabase.from("assignment_students").select("id", { count: "exact", head: true }).eq("status", "completed"),
        ]);
        setStats({
          students: s.count ?? 0,
          subjects: su.count ?? 0,
          topics: t.count ?? 0,
          tests: te.count ?? 0,
          assignments: asg.count ?? 0,
          completed: comp.count ?? 0,
        });
      } else {
        const { data: as } = await supabase
          .from("assignment_students")
          .select("id, status, score, total, assignment_id")
          .eq("student_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);
        const ids = (as ?? []).map((a) => a.assignment_id);
        const { data: asg } = ids.length ? await supabase.from("test_assignments").select("id, title, deadline, answers_published").in("id", ids) : { data: [] as any[] };
        const map = new Map((asg ?? []).map((a: any) => [a.id, a]));
        setPending((as ?? []).map((a: any) => ({ ...a, assignment: map.get(a.assignment_id) })).filter((a) => a.assignment));
      }
    })();
  }, [user?.id, role]);

  const ustozCards = [
    { icon: Users, label: uz.students, value: stats.students, to: "/students" },
    { icon: Library, label: uz.subjects, value: stats.subjects, to: "/subjects" },
    { icon: BookOpen, label: uz.topics, value: stats.topics, to: "/topics" },
    { icon: FileQuestion, label: uz.tests, value: stats.tests, to: "/tests" },
    { icon: ClipboardList, label: uz.assignments, value: stats.assignments, to: "/assignments" },
    { icon: Trophy, label: uz.completed, value: stats.completed, to: "/assignments" },
  ];

  return (
    <div className="animate-fade-in-up">
      <Card className="p-8 md:p-10 bg-gradient-hero text-primary-foreground mb-8 border-0 shadow-elegant relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow" />
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-accent/30 blur-3xl animate-float" />
        <div className="relative">
          <p className="text-primary-foreground/70 text-sm uppercase tracking-wider mb-2">{role === "ustoz" ? uz.ustoz : uz.talaba}</p>
          <h1 className="font-display font-black text-3xl md:text-5xl mb-3">
            Assalomu alaykum, {profile?.first_name || "..."}!
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-2xl">{uz.tagline}.</p>
          <div className="flex gap-3 mt-6 flex-wrap">
            {role === "ustoz" ? (
              <>
                <Button asChild variant="glow" size="lg"><Link to="/tests"><FileQuestion className="h-5 w-5" />{uz.tests}<ArrowRight className="h-4 w-4" /></Link></Button>
                <Button asChild variant="outline" size="lg" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  <Link to="/assignments"><ClipboardList className="h-5 w-5" />{uz.assignments}</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="glow" size="lg"><Link to="/my-assignments"><Inbox className="h-5 w-5" />{uz.myAssignments}<ArrowRight className="h-4 w-4" /></Link></Button>
                <Button asChild variant="outline" size="lg" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  <Link to="/topics"><BookOpen className="h-5 w-5" />{uz.topics}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {role === "ustoz" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {ustozCards.map((c, i) => (
            <Link to={c.to} key={c.label}>
              <Card className="p-6 bg-gradient-card border-0 shadow-card hover:shadow-elegant transition-all hover:-translate-y-1 animate-scale-in" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center justify-between mb-3">
                  <c.icon className="h-7 w-7 text-accent" />
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="font-display font-black text-3xl">{c.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{c.label}</div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div>
          <h2 className="font-display font-bold text-2xl mb-4 flex items-center gap-2"><Inbox className="h-6 w-6 text-accent" /> {uz.myAssignments}</h2>
          {pending.length === 0 ? (
            <Card className="p-12 text-center bg-gradient-card">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">{uz.noAssignments}</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {pending.map((p) => {
                const isCompleted = p.status === "completed";
                const pct = p.total ? Math.round((p.score / p.total) * 100) : 0;
                return (
                  <Card key={p.id} className="p-4 flex items-center justify-between gap-3 hover:shadow-card transition-all">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{p.assignment.title}</div>
                      <div className="flex gap-2 mt-1">
                        {isCompleted ? (
                          <Badge className="bg-success/15 text-success border-success/30">{uz.completed} — {pct}%</Badge>
                        ) : (
                          <Badge variant="secondary">{p.status === "in_progress" ? uz.inProgress : uz.pending}</Badge>
                        )}
                      </div>
                    </div>
                    <Button asChild size="sm" variant={isCompleted ? "outline" : "hero"}>
                      <Link to={isCompleted ? `/my-assignments/${p.assignment.id}` : `/my-assignments/${p.assignment.id}/take`}>
                        {isCompleted ? (p.assignment.answers_published ? uz.viewResult : uz.completed) : (p.status === "in_progress" ? uz.continueAssignment : uz.startAssignment)}
                      </Link>
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Index;
