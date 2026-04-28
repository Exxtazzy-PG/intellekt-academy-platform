import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { uz } from "@/i18n/uz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, FileQuestion, TrendingUp, ArrowRight } from "lucide-react";

const Index = () => {
  const { profile, role } = useAuth();
  const [stats, setStats] = useState({ students: 0, topics: 0, tests: 0, attempts: 0 });

  useEffect(() => {
    document.title = `${uz.dashboard} — ${uz.brand}`;
    (async () => {
      const [studentsRes, topicsRes, testsRes, attemptsRes] = await Promise.all([
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "talaba"),
        supabase.from("topics").select("id", { count: "exact", head: true }),
        supabase.from("tests").select("id", { count: "exact", head: true }),
        supabase.from("attempts").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        students: studentsRes.count ?? 0,
        topics: topicsRes.count ?? 0,
        tests: testsRes.count ?? 0,
        attempts: attemptsRes.count ?? 0,
      });
    })();
  }, []);

  const cards = [
    { icon: Users, label: uz.students, value: stats.students, to: "/students", color: "text-accent" },
    { icon: BookOpen, label: uz.topics, value: stats.topics, to: "/topics", color: "text-primary-glow" },
    { icon: FileQuestion, label: uz.tests, value: stats.tests, to: "/tests", color: "text-accent" },
    { icon: TrendingUp, label: uz.attemptsCount, value: stats.attempts, to: "/tests", color: "text-success" },
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
          <p className="text-primary-foreground/80 text-lg max-w-2xl">{uz.tagline}. Bilim olish va o'rgatish bir joyda.</p>
          <div className="flex gap-3 mt-6 flex-wrap">
            <Button asChild variant="glow" size="lg"><Link to="/topics"><BookOpen className="h-5 w-5" />{uz.topics}<ArrowRight className="h-4 w-4" /></Link></Button>
            <Button asChild variant="outline" size="lg" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/tests"><FileQuestion className="h-5 w-5" />{uz.tests}</Link>
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {cards.map((c, i) => (
          <Link to={c.to} key={c.label}>
            <Card className="p-6 bg-gradient-card border-0 shadow-card hover:shadow-elegant transition-all hover:-translate-y-1 animate-scale-in" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <c.icon className={`h-7 w-7 ${c.color}`} />
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="font-display font-black text-3xl">{c.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{c.label}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Index;
