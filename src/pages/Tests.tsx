import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { uz } from "@/i18n/uz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileQuestion, Loader2, Play, Pencil, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TestRow {
  id: string;
  title: string;
  description: string | null;
  topic_id: string;
  topic_title: string;
  question_count: number;
}

interface StudentLite { id: string; first_name: string | null; last_name: string | null; }

const Tests = () => {
  const { role, user } = useAuth();
  const [rows, setRows] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Distribute dialog
  const [distOpen, setDistOpen] = useState(false);
  const [distTest, setDistTest] = useState<TestRow | null>(null);
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [qPerStudent, setQPerStudent] = useState(10);
  const [secPerQ, setSecPerQ] = useState(60);
  const [deadlineHours, setDeadlineHours] = useState(24);
  const [distSaving, setDistSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: tests } = await supabase.from("tests").select("id, title, description, topic_id").order("created_at", { ascending: false });
    const topicIds = [...new Set((tests ?? []).map((t) => t.topic_id))];
    const { data: topics } = topicIds.length
      ? await supabase.from("topics").select("id, title").in("id", topicIds)
      : { data: [] as { id: string; title: string }[] };
    const topicMap = new Map((topics ?? []).map((t) => [t.id, t.title]));
    const testIds = (tests ?? []).map((t) => t.id);
    const { data: qs } = testIds.length
      ? await supabase.from("questions").select("test_id").in("test_id", testIds)
      : { data: [] as { test_id: string }[] };
    const counts: Record<string, number> = {};
    (qs ?? []).forEach((q) => { counts[q.test_id] = (counts[q.test_id] ?? 0) + 1; });
    setRows((tests ?? []).map((t) => ({ ...t, topic_title: topicMap.get(t.topic_id) ?? "—", question_count: counts[t.id] ?? 0 })));
    setLoading(false);
  };

  useEffect(() => {
    document.title = `${uz.testsTitle} — ${uz.brand}`;
    load();
  }, []);

  const openDistribute = async (t: TestRow) => {
    if (t.question_count === 0) return toast.error(uz.notEnoughQuestions);
    setDistTest(t);
    setQPerStudent(Math.min(10, t.question_count));
    setSecPerQ(60);
    setDeadlineHours(24);
    setSelectedStudents(new Set());
    setDistOpen(true);
    // load students
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "talaba");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (!ids.length) { setStudents([]); return; }
    const { data: profs } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
    setStudents(profs ?? []);
  };

  const toggleStudent = (id: string) => {
    const s = new Set(selectedStudents);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedStudents(s);
  };

  const toggleAll = () => {
    if (selectedStudents.size === students.length) setSelectedStudents(new Set());
    else setSelectedStudents(new Set(students.map((s) => s.id)));
  };

  const distribute = async () => {
    if (!distTest || !user) return;
    if (selectedStudents.size === 0) return toast.error(uz.selectAtLeastOne);
    if (qPerStudent < 1 || qPerStudent > distTest.question_count) {
      return toast.error(`1 — ${distTest.question_count}`);
    }
    setDistSaving(true);

    // 1. fetch all question IDs of this test
    const { data: allQs } = await supabase.from("questions").select("id").eq("test_id", distTest.id);
    const questionIds = (allQs ?? []).map((q) => q.id);
    if (questionIds.length < qPerStudent) {
      setDistSaving(false);
      return toast.error(uz.notEnoughQuestions);
    }

    // 2. create assignment
    const deadline = deadlineHours > 0 ? new Date(Date.now() + deadlineHours * 3600 * 1000).toISOString() : null;
    const { data: asg, error: aErr } = await supabase
      .from("test_assignments")
      .insert({
        test_id: distTest.id,
        created_by: user.id,
        questions_per_student: qPerStudent,
        seconds_per_question: secPerQ,
        deadline,
        title: distTest.title,
      })
      .select("id")
      .single();
    if (aErr || !asg) { setDistSaving(false); return toast.error(aErr?.message ?? "Error"); }

    // 3. for each student: pick random questions, create assignment_students + assignment_questions
    const studentArr = Array.from(selectedStudents);
    const asRows = studentArr.map((sid) => ({ assignment_id: asg.id, student_id: sid, total: qPerStudent, status: "pending" }));
    const { error: asErr } = await supabase.from("assignment_students").insert(asRows);
    if (asErr) { setDistSaving(false); return toast.error(asErr.message); }

    const aqRows: { assignment_id: string; student_id: string; question_id: string; position: number }[] = [];
    for (const sid of studentArr) {
      const shuffled = [...questionIds].sort(() => Math.random() - 0.5).slice(0, qPerStudent);
      shuffled.forEach((qid, i) => aqRows.push({ assignment_id: asg.id, student_id: sid, question_id: qid, position: i }));
    }
    // chunked insert
    const chunkSize = 500;
    for (let i = 0; i < aqRows.length; i += chunkSize) {
      const { error } = await supabase.from("assignment_questions").insert(aqRows.slice(i, i + chunkSize));
      if (error) { setDistSaving(false); return toast.error(error.message); }
    }

    // 4. notifications
    const notifs = studentArr.map((sid) => ({
      user_id: sid,
      type: "assignment",
      title: uz.newAssignmentTitle,
      message: `${uz.newAssignmentMsg}: ${distTest.title}`,
      link: "/my-assignments",
    }));
    await supabase.from("notifications").insert(notifs);

    setDistSaving(false);
    toast.success(uz.distributed);
    setDistOpen(false);
  };

  const removeTest = async (id: string) => {
    if (!confirm(uz.confirm)) return;
    const { error } = await supabase.from("tests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(uz.success);
    load();
  };

  return (
    <div className="animate-fade-in-up">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center"><FileQuestion className="h-5 w-5 text-accent" /></div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl">{uz.testsTitle}</h1>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center bg-gradient-card">
          <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">{uz.empty}</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((t, i) => (
            <Card key={t.id} className="p-6 bg-gradient-card border-0 shadow-card hover:shadow-elegant transition-all hover:-translate-y-1 animate-scale-in" style={{ animationDelay: `${i * 40}ms` }}>
              <Badge variant="secondary" className="mb-3">{t.topic_title}</Badge>
              <h3 className="font-display font-bold text-lg mb-1">{t.title}</h3>
              {t.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{t.description}</p>}
              <div className="text-sm text-muted-foreground mb-4">{t.question_count} {uz.questions}</div>

              {role === "ustoz" ? (
                <div className="space-y-2">
                  <Button variant="hero" className="w-full" onClick={() => openDistribute(t)} disabled={t.question_count === 0}>
                    <Send className="h-4 w-4" /> {uz.distributeTest}
                  </Button>
                  <div className="flex gap-2">
                    <Button asChild variant="soft" className="flex-1"><Link to={`/tests/${t.id}/edit`}><Pencil className="h-4 w-4" />{uz.edit}</Link></Button>
                    <Button variant="ghost" size="icon" onClick={() => removeTest(t.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">{uz.myAssignments}da kuting</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Distribute dialog */}
      <Dialog open={distOpen} onOpenChange={setDistOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{uz.distributeTestTitle}</DialogTitle>
            <DialogDescription>{distTest?.title} — {distTest?.question_count} {uz.questions}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{uz.questionsPerStudent}</Label>
                <Input type="number" min={1} max={distTest?.question_count ?? 1} value={qPerStudent}
                  onChange={(e) => setQPerStudent(Math.max(1, parseInt(e.target.value) || 1))} />
              </div>
              <div className="space-y-1.5">
                <Label>{uz.secondsPerQuestion}</Label>
                <Input type="number" min={10} max={600} value={secPerQ}
                  onChange={(e) => setSecPerQ(Math.max(10, parseInt(e.target.value) || 60))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{uz.deadline} ({uz.withinHours})</Label>
              <Input type="number" min={0} max={720} value={deadlineHours}
                onChange={(e) => setDeadlineHours(Math.max(0, parseInt(e.target.value) || 0))} />
              <p className="text-xs text-muted-foreground">0 = {uz.noDeadline}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{uz.selectStudents} ({selectedStudents.size}/{students.length})</Label>
                <Button variant="ghost" size="sm" onClick={toggleAll} className="h-7 text-xs">
                  {selectedStudents.size === students.length ? uz.deselectAll : uz.selectAll}
                </Button>
              </div>
              <ScrollArea className="h-48 border rounded-md p-2">
                {students.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">{uz.noStudents}</p>
                ) : students.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={selectedStudents.has(s.id)} onCheckedChange={() => toggleStudent(s.id)} />
                    <span className="text-sm">{s.first_name} {s.last_name}</span>
                  </label>
                ))}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDistOpen(false)}>{uz.cancel}</Button>
            <Button variant="hero" onClick={distribute} disabled={distSaving}>
              {distSaving && <Loader2 className="h-4 w-4 animate-spin" />} <Send className="h-4 w-4" /> {uz.distribute}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tests;
