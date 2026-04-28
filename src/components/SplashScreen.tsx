import { useEffect, useState } from "react";
import { uz } from "@/i18n/uz";
import { GraduationCap } from "lucide-react";

interface SplashProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashProps) => {
  const [exiting, setExiting] = useState(false);
  const letters = "Intellekt Academy".split("");

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 2600);
    const t2 = setTimeout(onComplete, 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-gradient-hero transition-opacity duration-500 ${
        exiting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* glowing orb */}
      <div className="absolute inset-0 bg-gradient-glow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-accent/20 blur-[120px] animate-glow-pulse" />

      <div className="relative flex flex-col items-center gap-8 px-6">
        {/* Icon */}
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl bg-accent/40 blur-xl animate-glow-pulse" />
          <div className="relative h-24 w-24 rounded-3xl bg-gradient-ocean flex items-center justify-center shadow-glow animate-float">
            <GraduationCap className="h-12 w-12 text-primary-foreground" strokeWidth={2} />
          </div>
        </div>

        {/* Letter-by-letter title */}
        <h1 className="font-display font-black text-5xl md:text-7xl text-primary-foreground tracking-tight flex flex-wrap justify-center [perspective:600px]">
          {letters.map((ch, i) => (
            <span
              key={i}
              className="inline-block animate-letter-reveal"
              style={{ animationDelay: `${i * 60 + 300}ms` }}
            >
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))}
        </h1>

        <p
          className="text-accent text-lg font-medium tracking-wider uppercase animate-fade-in opacity-0"
          style={{ animationDelay: "1.6s", animationFillMode: "forwards" }}
        >
          {uz.tagline}
        </p>

        {/* Loading bar */}
        <div
          className="mt-4 h-[2px] w-48 overflow-hidden rounded-full bg-primary-foreground/20 animate-fade-in opacity-0"
          style={{ animationDelay: "1.9s", animationFillMode: "forwards" }}
        >
          <div
            className="h-full bg-gradient-to-r from-accent via-primary-glow to-accent rounded-full"
            style={{
              width: "100%",
              transform: "translateX(-100%)",
              animation: "shimmer 1.4s ease-in-out 2s forwards",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
