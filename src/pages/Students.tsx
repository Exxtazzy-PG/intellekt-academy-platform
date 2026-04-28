import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { uz } from "@/i18n/uz";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, Loader2, TrendingUp } from "lucide-react";

interface StudentRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  attempts: number;
  avgScore: number;
}

const Students = () => {
  const { role } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.title = `${uz.studentsTitle} — ${uz.brand}`;
  }, []);

  useEffect(() => {
    const load = async () => {
      // 1. all profiles with talaba role
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").eq("role", "talaba");
      const ids = roles?.map((r) => r.user_id) ?? [];
      if (ids.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }
      const { data: profiles } = await supabase.from("profiles").select("id, first_name, last_name, avatar_url").in("id", ids);

      // 2. attempts for stats (only ustoz can fetch all)
      const { data: attempts } = await supabase.from("attempts").select("student_id, score, total").in("student_id", ids);

      const rows: StudentRow[] = (profiles ?? []).map((p) => {
        const userAttempts = attempts?.filter((a) => a.student_id === p.id) ?? [];
        const avg =
          userAttempts.length > 0
            ? Math.round(
                (userAttempts.reduce((s, a) => s + (a.total > 0 ? (a.score / a.total) * 100 : 0), 0) /
                  userAttempts.length) *
                  10
              ) / 10
            : 0;
        return { ...p, attempts: userAttempts.length, avgScore: avg };
      });

      setStudents(rows);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = students.filter((s) =>
    `${s.first_name ?? ""} ${s.last_name ?? ""}`.toLowerCase().includes(query.toLowerCase())
  );

  if (role !== "ustoz") {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Bu bo'lim faqat ustoz uchun.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <Users className="h-5 w-5 text-accent" />
          </div>
          <h1 className="font-display font-bold text-3xl md:text-4xl">{uz.studentsTitle}</h1>
        </div>
        <p className="text-muted-foreground">{uz.studentsSubtitle}</p>
      </header>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={uz.search} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center bg-gradient-card">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">{uz.noStudents}</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s, i) => {
            const initials = `${s.first_name?.[0] ?? ""}${s.last_name?.[0] ?? ""}`.toUpperCase() || "?";
            return (
              <Card
                key={s.id}
                className="p-5 bg-gradient-card border-0 shadow-card hover:shadow-elegant transition-all hover:-translate-y-1 animate-scale-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 ring-2 ring-accent/20">
                    <AvatarImage src={s.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-gradient-ocean text-primary-foreground font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold truncate">
                      {s.first_name} {s.last_name}
                    </h3>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {uz.talaba}
                    </Badge>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 pt-4 border-t border-border">
                  <div>
                    <div className="text-xs text-muted-foreground">{uz.attemptsCount}</div>
                    <div className="font-display font-bold text-xl">{s.attempts}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> {uz.avgScore}
                    </div>
                    <div className="font-display font-bold text-xl text-accent">{s.avgScore}%</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Students;
