import { LayoutDashboard, Briefcase, Grid3X3 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'My Portfolio', path: '/portfolio', icon: Briefcase },
  { label: 'Sectors', path: '/sectors', icon: Grid3X3 },
];

export default function LeftSidebar() {
  return (
    <aside className="w-14 md:w-64 h-full glass-strong border-r border-border/10 bg-background/50 flex flex-col justify-between shrink-0 transition-all">
      <nav className="space-y-2 mt-8">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 md:px-4 py-3 text-body transition-all duration-300 relative group ${
                isActive
                  ? 'text-psx-green font-bold'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              }`
            }
          >
            {({ isActive: active }) => (
              <>
                <AnimatePresence>
                  {active && (
                    <motion.div
                      layoutId="sidebar-active-bg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-psx-green/10 shadow-[inset_4px_0_15px_-4px_rgba(16,185,129,0.2)] -z-10"
                    />
                  )}
                </AnimatePresence>

                <item.icon className={`w-5 h-5 shrink-0 transition-all duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} strokeWidth={active ? 2.5 : 1.5} />
                <span className="hidden md:inline transition-all duration-300">{item.label}</span>
                
                <AnimatePresence>
                  {active && (
                    <motion.div 
                      layoutId="sidebar-active-line"
                      className="absolute left-0 top-0 h-full w-1.5 bg-psx-green shadow-[2px_0_15px_rgba(16,185,129,0.5)]" 
                    />
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section: Full Form Text */}
      <div className="mb-4 px-3 md:px-4 hidden md:block">
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
