import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { uz } from "@/i18n/uz";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Loader2 } from "lucide-react";

interface Row {
  student_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  total_score: number;
  total_questions: number;
  tests_completed: number;
  pct: number;
}

const Leaderboard = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `${uz.leaderboardTitle} — ${uz.brand}`;
    (async () => {
      const { data: as } = await supabase
        .from("assignment_students")
        .select("student_id, score, total")
        .eq("status", "completed");
      const map = new Map<string, { score: number; total: number; count: number }>();
      (as ?? []).forEach((a) => {
        const ex = map.get(a.student_id) ?? { score: 0, total: 0, count: 0 };
        ex.score += a.score; ex.total += a.total; ex.count += 1;
        map.set(a.student_id, ex);
      });
      const ids = [...map.keys()];
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, first_name, last_name, avatar_url").in("id", ids)
        : { data: [] as any[] };
      const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const list: Row[] = ids.map((id) => {
        const s = map.get(id)!;
        const p = pmap.get(id) ?? {};
        return {
          student_id: id,
          first_name: p.first_name ?? null,
          last_name: p.last_name ?? null,
          avatar_url: p.avatar_url ?? null,
          total_score: s.score,
          total_questions: s.total,
          tests_completed: s.count,
          pct: s.total ? Math.round((s.score / s.total) * 100) : 0,
        };
      }).sort((a, b) => b.total_score - a.total_score || b.pct - a.pct);
      setRows(list);
      setLoading(false);
    })();
  }, []);

  const myRank = rows.findIndex((r) => r.student_id === user?.id) + 1;

  const medal = (i: number) => {
    if (i === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (i === 1) return <Medal className="h-5 w-5 text-slate-400" />;
    if (i === 2) return <Award className="h-5 w-5 text-amber-700" />;
    return <span className="font-display font-bold text-sm text-muted-foreground">#{i + 1}</span>;
  };

  return (
    <div className="animate-fade-in-up">
      <header className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center"><Trophy className="h-5 w-5 text-accent" /></div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl">{uz.leaderboardTitle}</h1>
        </div>
        <p className="text-muted-foreground text-sm md:text-base">{uz.leaderboardSubtitle}</p>
        {myRank > 0 && (
          <Badge className="mt-3 bg-accent/15 text-accent border-accent/30">{uz.yourRank}: #{myRank}</Badge>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center bg-gradient-card">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">{uz.noLeaderboard}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => {
            const isMe = r.student_id === user?.id;
            const initials = `${r.first_name?.[0] ?? ""}${r.last_name?.[0] ?? ""}`.toUpperCase() || "?";
            return (
              <Card
                key={r.student_id}
                className={`p-3 sm:p-4 flex items-center gap-3 sm:gap-4 transition-all hover:shadow-card animate-scale-in ${
                  isMe ? "ring-2 ring-accent bg-accent/5" : ""
                } ${i < 3 ? "bg-gradient-card" : ""}`}
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <div className="w-8 flex items-center justify-center shrink-0">{medal(i)}</div>
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={r.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-muted text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm sm:text-base truncate">
                    {r.first_name} {r.last_name} {isMe && <span className="text-accent text-xs">(siz)</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.tests_completed} {uz.testsCompleted} • {r.pct}%
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display font-black text-lg sm:text-2xl text-accent">{r.total_score}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{uz.totalScore}</div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
