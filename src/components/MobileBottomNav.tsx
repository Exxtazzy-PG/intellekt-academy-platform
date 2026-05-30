import { NavLink } from "react-router-dom";
import { LayoutDashboard, BookOpen, FileQuestion, Inbox, ClipboardList, Trophy, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { uz } from "@/i18n/uz";
import { cn } from "@/lib/utils";

const MobileBottomNav = () => {
  const { role } = useAuth();

  const items = [
    { to: "/", icon: LayoutDashboard, label: uz.dashboard, end: true, show: true },
    { to: "/topics", icon: BookOpen, label: uz.topics, show: true },
    role === "ustoz"
      ? { to: "/tests", icon: FileQuestion, label: uz.tests, show: true }
      : { to: "/my-assignments", icon: Inbox, label: uz.myAssignments, show: true },
    role === "ustoz"
      ? { to: "/assignments", icon: ClipboardList, label: uz.assignments, show: true }
      : { to: "/leaderboard", icon: Trophy, label: uz.leaderboard, show: true },
    { to: "/settings", icon: Settings, label: uz.settings, show: true },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-border/60 pb-safe">
      <ul className="grid grid-cols-5 px-1 pt-1.5 pb-1.5">
        {items.map(({ to, icon: Icon, label, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl transition-all duration-200 active:scale-95",
                  isActive ? "text-accent" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={cn(
                      "h-9 w-12 rounded-xl flex items-center justify-center transition-all",
                      isActive && "bg-accent/12",
                    )}
                  >
                    <Icon className={cn("h-[20px] w-[20px]", isActive && "scale-110")} strokeWidth={isActive ? 2.4 : 2} />
                  </div>
                  <span className={cn("text-[10px] leading-none truncate max-w-full", isActive ? "font-semibold" : "font-medium")}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
