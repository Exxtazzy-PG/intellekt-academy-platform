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
  useSidebar,
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
} from "lucide-react";
import NotificationsBell from "@/components/NotificationsBell";

const InnerLayout = ({ children }: { children: ReactNode }) => {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const initials = `${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}`.toUpperCase() || "?";

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: uz.dashboard, end: true, show: true },
    { to: "/subjects", icon: Library, label: uz.subjects, show: true },
    { to: "/topics", icon: BookOpen, label: uz.topics, show: true },
    { to: "/tests", icon: FileQuestion, label: uz.tests, show: true },
    { to: "/assignments", icon: ClipboardList, label: uz.assignments, show: role === "ustoz" },
    { to: "/my-assignments", icon: Inbox, label: uz.myAssignments, show: role === "talaba" },
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
        <SidebarHeader className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-ocean flex items-center justify-center shadow-glow shrink-0">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-display font-bold text-base leading-none truncate">{uz.brand}</div>
                <div className="text-xs text-muted-foreground mt-1 truncate">{uz.tagline}</div>
              </div>
            )}
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
                        <span>{label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t p-3">
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 mb-2 px-1">
                <Avatar className="h-9 w-9 ring-2 ring-accent/30">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-sidebar-accent text-sm font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{profile?.first_name} {profile?.last_name}</div>
                  <div className="text-xs text-muted-foreground">{role === "ustoz" ? uz.ustoz : uz.talaba}</div>
                </div>
              </div>
              <Button onClick={handleLogout} variant="ghost" size="sm" className="w-full justify-start">
                <LogOut className="h-4 w-4" /> {uz.logout}
              </Button>
            </>
          ) : (
            <Button onClick={handleLogout} variant="ghost" size="icon" className="mx-auto" title={uz.logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </SidebarFooter>
      </Sidebar>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 h-14 border-b bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="h-9 w-9" />
            <div className="md:hidden flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-ocean flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-sm">{uz.brand}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
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
