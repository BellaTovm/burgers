import { ArrowRight, CircleAlert, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { getGetCurrentProfileQueryKey, useGetCurrentProfile, useLogOut } from '@workspace/api-client-react';
import { clearSession, isSignedIn } from '@/lib/session';

function ProfileSkeleton() {
  return <div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-[var(--ink)]/10" /><div className="h-16 w-full bg-[var(--ink)]/10" /><div className="h-16 w-full bg-[var(--ink)]/10" /></div>;
}

export default function Account() {
  const [, setLocation] = useLocation();
  const hasToken = isSignedIn();
  const profileQuery = useGetCurrentProfile({ query: { enabled: hasToken, queryKey: getGetCurrentProfileQueryKey() } });
  const logout = useLogOut();
  const [logoutError, setLogoutError] = useState('');
  const profile = profileQuery.data;

  const signOut = () => {
    setLogoutError('');
    logout.mutate(undefined, {
      onSuccess: () => { clearSession(); setLocation('/'); },
      onError: error => setLogoutError(error instanceof Error ? error.message : 'Unable to sign out.'),
    });
  };

  return (
    <div className="grain min-h-[100dvh] bg-[var(--paper)] text-[var(--ink)]">
      <header className="border-b-2 border-[var(--ink)] bg-[var(--ink)] px-5 py-5 text-[var(--paper)] md:px-10">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between"><Link href="/" className="display-face text-2xl tracking-[-.08em]" data-testid="link-account-wordmark">BUNSEN<span className="text-[var(--acid)]">.</span></Link><Link href="/" className="inline-flex items-center gap-2 mono-face text-[10px] uppercase tracking-[.17em] text-[var(--paper)]/65 hover:text-[var(--acid)]" data-testid="link-account-back"><ArrowRight className="rotate-180" size={15} /> Back to menu</Link></div>
      </header>
      <main className="mx-auto max-w-[1000px] px-5 py-16 md:px-10 md:py-24">
        <p className="mono-face text-[10px] uppercase tracking-[.22em] text-[var(--tomato)]">Customer area</p>
        <div className="mt-4 flex flex-col justify-between gap-8 border-b-2 border-[var(--ink)] pb-10 md:flex-row md:items-end"><h1 className="display-face text-7xl leading-[.78] md:text-[9rem]">YOUR<br /><span className="text-[var(--tomato)]">COUNTER.</span></h1>{profile && <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center bg-[var(--acid)] display-face text-2xl">{profile.email.slice(0, 1).toUpperCase()}</div><div><p className="mono-face text-[10px] uppercase tracking-[.15em]">Signed in as</p><p className="text-sm font-semibold" data-testid="text-profile-email">{profile.email}</p></div></div>}</div>
        {!hasToken ? <div className="mt-12 grid gap-8 border-t border-[var(--ink)]/20 pt-8 md:grid-cols-[1fr_1fr]"><div><UserRound size={25} /><h2 className="display-face mt-5 text-4xl">NOT SIGNED IN.</h2><p className="mt-3 max-w-sm text-sm leading-6 text-[var(--ink)]/60">Sign in to keep your details ready for the next time you’re hungry.</p></div><div className="flex flex-col items-start gap-3 md:items-end"><Link href="/login" className="inline-flex items-center gap-3 bg-[var(--ink)] px-5 py-4 mono-face text-[10px] uppercase tracking-[.17em] text-[var(--paper)]" data-testid="link-account-login">Sign in <ArrowRight size={15} /></Link><Link href="/signup" className="border-b border-[var(--ink)] pb-1 mono-face text-[10px] uppercase tracking-[.17em]" data-testid="link-account-signup">Create account</Link></div></div> : profileQuery.isLoading ? <div className="mt-12"><ProfileSkeleton /></div> : profileQuery.isError ? <div className="mt-12 flex gap-3 border-l-2 border-[var(--tomato)] bg-[var(--tomato)]/10 p-5 text-sm" data-testid="error-profile"><CircleAlert className="shrink-0 text-[var(--tomato)]" size={18} /><span>We couldn’t load your profile. Your session may have expired. <Link href="/login" className="underline" data-testid="link-profile-retry">Sign in again.</Link></span></div> : profile ? <div className="mt-12 grid gap-6 md:grid-cols-[1.2fr_.8fr]"><div className="border border-[var(--ink)]/25 bg-[var(--paper)] p-6"><p className="mono-face text-[10px] uppercase tracking-[.18em] text-[var(--ink)]/45">Profile details</p><div className="mt-7 space-y-5"><div className="flex items-center gap-4 border-b border-[var(--ink)]/15 pb-5"><Mail className="text-[var(--tomato)]" size={20} /><div><p className="mono-face text-[9px] uppercase tracking-[.15em] text-[var(--ink)]/45">Email</p><p className="mt-1 text-sm" data-testid="text-account-email">{profile.email}</p></div></div><div className="flex items-center gap-4"><ShieldCheck className="text-[var(--tomato)]" size={20} /><div><p className="mono-face text-[9px] uppercase tracking-[.15em] text-[var(--ink)]/45">Profile role</p><p className="mt-1 text-sm capitalize" data-testid="text-account-role">{profile.role}</p></div></div></div></div><div className="flex flex-col justify-between bg-[var(--acid)] p-6"><div><p className="mono-face text-[10px] uppercase tracking-[.18em]">Next time</p><h2 className="display-face mt-5 text-5xl leading-[.85]">ORDER<br />FASTER.</h2><p className="mt-5 max-w-xs text-sm leading-6 text-[var(--ink)]/65">Your account is ready. We’ll see you at the counter.</p></div><div>{logoutError && <p className="mb-3 text-xs text-[var(--tomato)]" data-testid="error-logout">{logoutError}</p>}<button onClick={signOut} disabled={logout.isPending} className="mt-8 inline-flex items-center gap-3 border-b-2 border-[var(--ink)] pb-2 mono-face text-[10px] uppercase tracking-[.17em] disabled:opacity-50" data-testid="button-logout">{logout.isPending ? 'Signing out...' : 'Sign out'} <LogOut size={15} /></button></div></div></div> : null}
      </main>
    </div>
  );
}