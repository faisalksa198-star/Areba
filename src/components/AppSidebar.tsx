import { LayoutDashboard, Database, Package, ShoppingCart, LogOut, Users, ClipboardList, Calculator, FileText, Store, ShoppingBag } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const baseMenuItems = [
  { title: 'لوحة التحكم', url: '/dashboard', icon: LayoutDashboard },
  { title: 'الطلبات', url: '/orders', icon: ShoppingCart },
  { title: 'طلباتي', url: '/my-orders', icon: ClipboardList },
  { title: 'حاسبة الأسعار', url: '/admin-calculator', icon: Calculator },
  { title: 'الفواتير الإلكترونية', url: '/invoices', icon: FileText },
];

const adminMenuItems = [
  { title: 'مركز البيانات', url: '/data-center', icon: Database },
  { title: 'الأطقم الجاهزة', url: '/kits', icon: Package },
  { title: 'إدارة الموظفين', url: '/employees', icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setIsAdmin(data?.role === 'owner' || data?.role === 'manager');
      });
  }, [user]);

  const allItems = isAdmin
    ? [...baseMenuItems.slice(0, 1), ...adminMenuItems.slice(0, 2), ...baseMenuItems.slice(1), adminMenuItems[2]]
    : baseMenuItems;

  return (
    <Sidebar collapsible="icon" side="right" className="border-l-0 border-r border-sidebar-border">
      <SidebarContent className="pt-4">
        {/* Brand */}
        {!collapsed && (
          <div className="px-4 pb-4 mb-2 border-b border-sidebar-border">
            <div className="flex justify-center mb-3">
              <img src="/logo.svg" alt="متجر Areba" className="h-14 w-14 rounded-xl object-contain brightness-0 invert" />
            </div>
            <div className="text-center space-y-0.5">
              <h2 className="text-sm font-bold text-sidebar-foreground">متجر Areba</h2>
              <p className="text-[10px] text-sidebar-foreground/50">إدارة الطلبات</p>
              {user && (
                <p className="text-xs text-sidebar-foreground/60 pt-1">
                  مرحباً {user.user_metadata?.full_name || 'بك'}
                </p>
              )}
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {allItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="text-sm">تسجيل الخروج</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
