import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { uz } from "@/i18n/uz";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Users,
  BookOpen,
  FileQuestion,
  Settings,
  LogOut,
  GraduationCap,
  LayoutDashboard,
  Library,
  ClipboardList,
  Inbox,
  Trophy,
} from "lucide-react";
import NotificationsBell from "@/components/NotificationsBell";

const InnerLayout = ({ children }: { children: ReactNode }) => {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  const initials = `${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}`.toUpperCase() || "?";

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: uz.dashboard, end: true, show: true },
    { to: "/subjects", icon: Library, label: uz.subjects, show: true },
    { to: "/topics", icon: BookOpen, label: uz.topics, show: true },
    { to: "/tests", icon: FileQuestion, label: uz.tests, show: true },
    { to: "/assignments", icon: ClipboardList, label: uz.assignments, show: role === "ustoz" },
    { to: "/my-assignments", icon: Inbox, label: uz.myAssignments, show: role === "talaba" },
    { to: "/leaderboard", icon: Trophy, label: uz.leaderboard, show: true },
    { to: "/students", icon: Users, label: uz.students, show: role === "ustoz" },
    { to: "/settings", icon: Settings, label: uz.settings, show: true },
  ].filter((i) => i.show);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="border-b p-2 group-data-[collapsible=icon]:p-1.5">
          <div className="flex items-center gap-3 px-1.5 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-ocean flex items-center justify-center shadow-glow shrink-0">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="font-display font-bold text-sm leading-none truncate">{uz.brand}</div>
              <div className="text-[11px] text-sidebar-foreground/60 mt-1 truncate">{uz.tagline}</div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map(({ to, icon: Icon, label, end }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild tooltip={label}>
                      <NavLink
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                          `flex items-center gap-3 ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : ""}`
                        }
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="truncate">{label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t p-2 group-data-[collapsible=icon]:p-1.5">
          <div className="flex items-center gap-2 px-1 py-1 mb-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mb-0">
            <Avatar className="h-8 w-8 ring-2 ring-accent/30 shrink-0">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-sidebar-accent text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <div className="font-semibold text-xs truncate">{profile?.first_name} {profile?.last_name}</div>
              <div className="text-[11px] text-sidebar-foreground/60 truncate">{role === "ustoz" ? uz.ustoz : uz.talaba}</div>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto"
            title={uz.logout}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">{uz.logout}</span>
          </Button>
        </SidebarFooter>
      </Sidebar>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-3 sm:px-4 h-14 border-b bg-card/80 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="h-9 w-9 shrink-0" />
            <div className="flex items-center gap-2 min-w-0 md:hidden">
              <div className="h-7 w-7 rounded-lg bg-gradient-ocean flex items-center justify-center shrink-0">
                <GraduationCap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-sm truncate">{uz.brand}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <NotificationsBell />
          </div>
        </header>
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};

const DashboardLayout = ({ children }: { children: ReactNode }) => (
  <SidebarProvider defaultOpen={false}>
    <InnerLayout>{children}</InnerLayout>
  </SidebarProvider>
);

export default DashboardLayout;
