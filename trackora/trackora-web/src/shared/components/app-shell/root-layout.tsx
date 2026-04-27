import { Outlet } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { useUiStore } from '@/features/auth/store/ui-store';
import { Sidebar } from './sidebar';
import { Header } from './header';

function RootLayout() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          onClick={() => useUiStore.getState().setSidebarCollapsed(true)}
          aria-hidden
        />
      )}

      {/* Main content area — shifts right to account for sidebar */}
      <div
        className={cn(
          'flex min-h-screen flex-col transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
          collapsed ? 'md:ml-[68px]' : 'md:ml-[260px]',
          /* On mobile the sidebar overlays, so no margin */
          'ml-0',
        )}
      >
        <Header />
        <main className="gradient-mesh relative flex-1 p-4 md:p-6">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export { RootLayout };
