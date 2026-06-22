import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ambient } from '@/components/Ambient';
import { Icon } from '@/components/Icon';
import { GlassPanel } from '@/components/ui';
import { useStore } from '@/store/useStore';

export function SignIn() {
  const navigate = useNavigate();
  const signIn = useStore((s) => s.signIn);
  const [email, setEmail] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // The room console authenticates against the local operator directory.
    // Any operator id is accepted in this build; demo mode requires nothing.
    signIn(email || 'operator@immerse-theater.com');
    navigate('/app/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-gutter">
      <Ambient />
      <main className="z-10 w-full max-w-[440px]">
        <GlassPanel edge className="p-lg shadow-xl">
          <div className="mb-xl flex flex-col items-center">
            <div className="mb-md flex h-16 w-16 items-center justify-center rounded-lg bg-primary-container shadow-[0_0_30px_rgba(75,142,255,0.3)]">
              <Icon name="settings_remote" filled className="text-on-primary-container" size={40} />
            </div>
            <h1 className="text-headline-lg tracking-tight text-primary">ImmerseOS</h1>
            <p className="mt-xs text-label-md text-on-surface-variant">
              Theater Control Interface
            </p>
          </div>

          <form className="space-y-lg" onSubmit={submit}>
            <div className="space-y-base">
              <label className="block px-xs text-label-sm uppercase tracking-widest text-on-surface-variant">
                Operator ID
              </label>
              <div className="group relative">
                <Icon
                  name="mail"
                  className="absolute left-base top-1/2 -translate-y-1/2 text-outline transition-colors group-focus-within:text-primary"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="email@immerse-theater.com"
                  className="w-full rounded-t bg-surface-container-low py-sm pl-xl pr-base text-body-md text-on-surface outline-none transition-all focus:shadow-[0_4px_12px_-4px_rgba(173,198,255,0.4)] [border-bottom:1px_solid_rgba(255,255,255,0.1)] focus:[border-bottom-color:#adc6ff]"
                />
              </div>
            </div>

            <div className="space-y-base">
              <div className="flex items-end justify-between">
                <label className="block px-xs text-label-sm uppercase tracking-widest text-on-surface-variant">
                  Access Key
                </label>
                <a href="#" className="text-label-sm text-primary transition-all hover:underline">
                  Forgot?
                </a>
              </div>
              <div className="group relative">
                <Icon
                  name="lock"
                  className="absolute left-base top-1/2 -translate-y-1/2 text-outline transition-colors group-focus-within:text-primary"
                />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  className="w-full rounded-t bg-surface-container-low py-sm pl-xl pr-base text-body-md text-on-surface outline-none transition-all focus:shadow-[0_4px_12px_-4px_rgba(173,198,255,0.4)] [border-bottom:1px_solid_rgba(255,255,255,0.1)] focus:[border-bottom-color:#adc6ff]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-bloom w-full rounded-lg bg-primary py-md text-label-md font-semibold text-on-primary transition-all duration-200 active:scale-[0.98]"
            >
              Authorize Access
            </button>

            <div className="flex items-center gap-base py-xs">
              <div className="h-px flex-grow bg-white/5" />
              <span className="text-label-sm uppercase tracking-tight text-outline">
                Secure Provider
              </span>
              <div className="h-px flex-grow bg-white/5" />
            </div>

            <div className="grid grid-cols-2 gap-md">
              <button
                type="button"
                onClick={submit}
                className="flex items-center justify-center gap-base rounded-lg border border-white/10 bg-white/5 py-sm transition-colors hover:bg-white/10"
              >
                <Icon name="terminal" size={20} className="text-on-surface-variant" />
                <span className="text-label-md">LDAP</span>
              </button>
              <button
                type="button"
                onClick={submit}
                className="flex items-center justify-center gap-base rounded-lg border border-white/10 bg-white/5 py-sm transition-colors hover:bg-white/10"
              >
                <Icon name="key" size={20} className="text-on-surface-variant" />
                <span className="text-label-md">SAML 2.0</span>
              </button>
            </div>
          </form>

          <div className="mt-xl flex items-center justify-between border-t border-white/5 pt-lg">
            <div className="flex items-center gap-xs">
              <span className="h-2 w-2 animate-pulse rounded-full bg-secondary-fixed-dim" />
              <span className="text-label-sm text-on-surface-variant">
                Stage Network: Active
              </span>
            </div>
            <div className="flex items-center gap-xs text-on-surface-variant">
              <Icon name="public" size={16} />
              <span className="text-label-sm">v1.0-Stable</span>
            </div>
          </div>
        </GlassPanel>
      </main>
    </div>
  );
}
