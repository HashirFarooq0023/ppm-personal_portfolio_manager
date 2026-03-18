import TopNavbar from '@/components/TopNavbar';
import LeftSidebar from '@/components/LeftSidebar';
import { Outlet } from 'react-router-dom';

export default function AppLayout() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-diagonal-pattern">
      <TopNavbar />
      <div className="flex-1 flex min-h-0">
        <LeftSidebar />
        <main className="flex-1 min-h-0 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
