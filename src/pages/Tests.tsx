import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { uz } from "@/i18n/uz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileQuestion, Loader2, Play, Pencil } from "lucide-react";

interface TestRow {
  id: string;
  title: string;
  description: string | null;
  topic_id: string;
  topic_title: string;
  question_count: number;
}

const Tests = () => {
  const { role } = useAuth();
  const [rows, setRows] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `${uz.testsTitle} — ${uz.brand}`;
    (async () => {
      const { data: tests } = await supabase.from("tests").select("id, title, description, topic_id").order("created_at", { ascending: false });
      const topicIds = [...new Set((tests ?? []).map((t) => t.topic_id))];
      const { data: topics } = await supabase.from("topics").select("id, title").in("id", topicIds);
      const topicMap = new Map((topics ?? []).map((t) => [t.id, t.title]));
      const { data: qs } = await supabase.from("questions").select("test_id").in("test_id", (tests ?? []).map((t) => t.id));
      const counts: Record<string, number> = {};
      (qs ?? []).forEach((q) => { counts[q.test_id] = (counts[q.test_id] ?? 0) + 1; });
      setRows((tests ?? []).map((t) => ({ ...t, topic_title: topicMap.get(t.topic_id) ?? "", question_count: counts[t.id] ?? 0 })));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="animate-fade-in-up">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center"><FileQuestion className="h-5 w-5 text-accent" /></div>
          <h1 className="font-display font-bold text-3xl md:text-4xl">{uz.testsTitle}</h1>
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
              {role === "talaba" && t.question_count > 0 && (
                <Button asChild variant="hero" className="w-full"><Link to={`/tests/${t.id}/take`}><Play className="h-4 w-4" />{uz.startTest}</Link></Button>
              )}
              {role === "ustoz" && (
                <Button asChild variant="soft" className="w-full"><Link to={`/tests/${t.id}/edit`}><Pencil className="h-4 w-4" />{uz.edit}</Link></Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Tests;
