import { LayoutDashboard, Briefcase, Grid3X3 } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Portfolio', path: '/portfolio', icon: Briefcase },
  { label: 'Sectors', path: '/sectors', icon: Grid3X3 },
];

export default function LeftSidebar() {
  return (
    <aside className="w-16 md:w-64 h-full glass-strong border-r border-border/10 bg-background/50 flex flex-col justify-between shrink-0 p-4 transition-all">
      <nav className="space-y-2 mt-4">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-body transition-colors ${
                isActive
                  ? 'bg-primary/15 text-primary font-medium shadow-sm'
                  : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span className="hidden md:inline">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section: Full Form Text */}
      <div className="mb-4 px-4 hidden md:block">
        <div className="h-px w-full bg-border/20 mb-4" /> {/* Subtle divider line */}
        <p className="text-xs text-muted-foreground uppercase tracking-widest leading-relaxed opacity-50 font-medium">
          Personal<br/>
          Portfolio<br/>
          Manager
        </p>
      </div>
    </aside>
  );
}
