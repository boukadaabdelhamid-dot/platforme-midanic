import { useAuth } from '@/contexts/auth-context';
import { Redirect, Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Package,
  Key,
  FileText,
  MessageSquare,
  Ticket,
  ChevronLeft,
  Menu,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/licenses', label: 'Licenses', icon: Key },
  { href: '/admin/content', label: 'Content', icon: FileText },
  { href: '/admin/crm', label: 'CRM', icon: MessageSquare },
  { href: '/admin/tickets', label: 'Support Tickets', icon: Ticket },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || user.role !== 'super_admin') {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] overflow-hidden bg-muted/30">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r bg-background transition-all duration-200',
          collapsed ? 'w-14' : 'w-56'
        )}
      >
        {/* Sidebar header */}
        <div className="flex h-12 items-center justify-between px-3 border-b">
          {!collapsed && (
            <span className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Admin
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 ml-auto"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? location === href : location.startsWith(href);
            return (
              <Link key={href} href={href}>
                <div
                  className={cn(
                    'flex items-center gap-3 mx-2 px-2 py-2 rounded-md text-sm cursor-pointer transition-colors',
                    active
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
