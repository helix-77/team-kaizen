import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, MessageSquareText, Activity, LogIn, UserPlus, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { logout as apiLogout } from '../lib/api';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Agentic AI', href: '/chat', icon: MessageSquareText },
  { name: 'Analytics', href: '/analytics', icon: Activity },
];

export function Sidebar() {
  const token = localStorage.getItem('token');

  return (
    <div className="flex h-screen w-64 flex-col bg-card/40 backdrop-blur-xl border-r border-border">
      <div className="flex h-16 items-center px-6 border-b border-border">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
          RentPi
        </h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                isActive
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                'group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 border border-transparent'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                    'mr-3 flex-shrink-0 h-5 w-5 transition-colors'
                  )}
                  aria-hidden="true"
                />
                <span className="truncate flex-1">{item.name}</span>
                {isActive && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="w-1.5 h-1.5 rounded-full bg-primary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}

        <div className="pt-4 mt-4 border-t border-border/50">
          {!token ? (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  cn(
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
                    'group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200'
                  )
                }
              >
                <LogIn className="mr-3 h-5 w-5" />
                Log In
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) =>
                  cn(
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
                    'group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200'
                  )
                }
              >
                <UserPlus className="mr-3 h-5 w-5" />
                Sign Up
              </NavLink>
            </>
          ) : (
            <button
              onClick={apiLogout}
              className="w-full group flex items-center px-3 py-2.5 text-sm font-medium rounded-md text-destructive hover:bg-destructive/10 transition-all duration-200"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Log Out
            </button>
          )}
        </div>
      </nav>
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary/20">
            {token ? 'UR' : 'G'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{token ? 'User' : 'Guest'}</p>
            <p className="text-xs text-muted-foreground truncate">{token ? 'logged-in@rentpi.com' : 'Welcome to RentPi'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
