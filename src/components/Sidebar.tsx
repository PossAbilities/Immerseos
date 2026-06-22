import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';
import { useStore } from '@/store/useStore';

const NAV = [
  { to: '/app/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/app/library', icon: 'auto_awesome', label: 'Experiences' },
  { to: '/app/editor/new', icon: 'architecture', label: 'Creator' },
  { to: '/app/remote', icon: 'settings_remote', label: 'Remote Control' },
  { to: '/app/settings', icon: 'settings', label: 'Settings' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const live = useStore((s) => s.live);
  const goLive = useStore((s) => s.goLive);
  const signOut = useStore((s) => s.signOut);

  return (
    <aside className="fixed left-0 top-0 z-[100] flex h-screen w-[280px] flex-col border-r border-white/10 bg-surface/60 px-base py-md shadow-xl backdrop-blur-md">
      <div className="mb-lg px-base pt-sm">
        <h1 className="text-headline-md font-semibold tracking-tight text-primary">
          ImmerseOS
        </h1>
        <p className="text-label-sm text-on-surface-variant opacity-70">
          Theater Control
        </p>
      </div>

      <nav className="flex-1 space-y-base">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-base rounded-lg p-sm transition-colors',
                isActive
                  ? 'border-r-2 border-primary bg-white/5 font-bold text-primary'
                  : 'text-on-surface-variant hover:bg-white/5',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  name={item.icon}
                  filled={isActive}
                  className={cn(!isActive && 'group-hover:text-primary')}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-base border-t border-white/5 pt-md">
        <button
          onClick={() => goLive(!live)}
          className={cn(
            'w-full rounded-lg py-sm font-bold shadow-lg shadow-primary/10 transition-all duration-200 active:scale-95',
            live
              ? 'bg-error text-on-error'
              : 'bg-primary-container text-on-primary-container',
          )}
        >
          {live ? 'Stop Output' : 'Go Live'}
        </button>
        <div className="pt-base">
          <a className="flex items-center gap-base rounded-lg p-sm text-on-surface-variant transition-colors hover:bg-white/5" href="#">
            <Icon name="help" />
            <span>Support</span>
          </a>
          <button
            onClick={() => {
              signOut();
              navigate('/signin');
            }}
            className="flex w-full items-center gap-base rounded-lg p-sm text-on-surface-variant transition-colors hover:bg-white/5"
          >
            <Icon name="logout" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
