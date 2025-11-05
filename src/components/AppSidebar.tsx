import { 
  Home, 
  Settings, 
  PlayCircle, 
  Library, 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  CreditCard, 
  User,
  Shield,
  Zap,
  Bot,
  BookOpen
} from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const mainItems = [
  { title: "Playbook", url: "/playbook", icon: Settings },
  { title: "Pipeline", url: "/pipeline", icon: PlayCircle },
  { title: "Video Production", url: "/video-production", icon: Zap },
  { title: "Library", url: "/library", icon: Library },
  { title: "Viral Intelligence", url: "/viral-intelligence", icon: TrendingUp },
  { title: "Reference Library", url: "/reference-library", icon: BookOpen },
  { title: "Schedule & Posting", url: "/schedule", icon: Calendar },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "AI Services 247", url: "/services", icon: Bot },
];

const accountItems = [
  { title: "Billing", url: "/billing", icon: CreditCard },
  { title: "Account", url: "/account", icon: User },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const [isAdmin, setIsAdmin] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('role, org_id')
          .eq('id', user.id)
          .single();
        
        setIsAdmin(data?.role === 'admin');

        // Load credits
        if (data?.org_id) {
          const { data: wallet } = await supabase
            .from('credits_wallet')
            .select('current_credits')
            .eq('org_id', data.org_id)
            .single();
          
          if (wallet) {
            setCredits(Math.floor(wallet.current_credits));
          }
        }
      }
    };
    checkAdmin();
  }, []);

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Home className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {open && (
            <div>
              <h2 className="text-sm font-semibold text-sidebar-foreground">VideoFactory247</h2>
              <p className="text-xs text-sidebar-foreground/70">AI Video Studio</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) => 
                        isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className={({ isActive }) => 
                        isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/admin"
                      className={({ isActive }) => 
                        isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                      }
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {credits !== null && (
        <SidebarFooter className="p-4 border-t border-sidebar-border">
          <NavLink to="/billing" className="block">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                {open && <span className="text-sm font-medium">Credits</span>}
              </div>
              {open && (
                <Badge variant="secondary" className="font-mono">
                  {credits}
                </Badge>
              )}
            </div>
          </NavLink>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
