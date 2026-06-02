import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { uz } from "@/i18n/uz";
import { GraduationCap, Mail, Lock, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "" });

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  // SEO
  useEffect(() => {
    document.title = mode === "login" ? `${uz.loginTitle} — ${uz.brand}` : `${uz.registerTitle} — ${uz.brand}`;
    const meta = document.querySelector('meta[name="description"]') ?? document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute("content", `${uz.brand} — ${uz.tagline}. ${uz.loginSubtitle}`);
    if (!meta.parentNode) document.head.appendChild(meta);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || (mode === "register" && (!form.firstName || !form.lastName))) {
      toast.error(uz.fillAllFields);
      return;
    }
    setLoading(true);
    if (mode === "login") {
      const { error } = await signIn(form.email, form.password);
      if (error) toast.error(uz.invalidCredentials);
      else toast.success(uz.success);
    } else {
      const { error } = await signUp(form.email, form.password, form.firstName, form.lastName);
      if (error) toast.error(error);
      else toast.success(uz.registerSuccess);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Theme-aware ambient background */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-80" />
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-accent/25 blur-3xl animate-float" />
      <div
        className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary-glow/25 blur-3xl animate-float"
        style={{ animationDelay: "1s" }}
      />

      <Card className="relative w-full max-w-md p-7 sm:p-9 shadow-elegant border border-border/60 glass-strong animate-scale-in">
        <div className="flex flex-col items-center mb-7">
          <div className="h-16 w-16 rounded-2xl bg-gradient-ocean flex items-center justify-center shadow-glow mb-4">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl text-foreground">{uz.brand}</h1>
          <p className="text-muted-foreground text-sm mt-1 text-center">
            {mode === "login" ? uz.loginSubtitle : uz.registerSubtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
              <div className="space-y-1.5">
                <Label htmlFor="fn">{uz.firstName}</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground" />
                  <Input
                    id="fn"
                    className="pl-10"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    maxLength={50}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ln">{uz.lastName}</Label>
                <Input
                  id="ln"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  maxLength={50}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">{uz.email}</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground" />
              <Input
                id="email"
                type="email"
                className="pl-10"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                maxLength={255}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pwd">{uz.password}</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground" />
              <Input
                id="pwd"
                type="password"
                className="pl-10"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={6}
                maxLength={72}
                required
              />
            </div>
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full mt-2 text-white" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading
              ? mode === "login"
                ? uz.loggingIn
                : uz.registering
              : mode === "login"
                ? uz.loginCta
                : uz.registerCta}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? uz.noAccount : uz.haveAccount}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="text-accent font-semibold hover:underline"
          >
            {mode === "login" ? uz.register : uz.login}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
