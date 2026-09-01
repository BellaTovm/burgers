import { ArrowLeft, ArrowRight, CircleAlert, Eye, EyeOff } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useLogIn, useSignUp } from '@workspace/api-client-react';
import { Wordmark } from '@/components/site-header';

type AuthMode = 'login' | 'signup';

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message.replace(/^HTTP \d+ [^:]+:\s*/, '');
  return 'Something went wrong. Please try again.';
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const mutation = mode === 'login' ? useLogIn() : useSignUp();
  const isLogin = mode === 'login';

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    if (!email.trim() || !email.includes('@')) { setFormError('Enter a valid email address.'); return; }
    if (password.length < 6) { setFormError('Your password needs at least 6 characters.'); return; }
    mutation.mutate({ data: { email: email.trim(), password } }, {
      onSuccess: response => {
        if (!response.access_token) {
          setFormError('Account created. Check your email to confirm it before signing in.');
          setPassword('');
          return;
        }
        localStorage.setItem('bunsen_access_token', response.access_token);
        localStorage.setItem('bunsen_refresh_token', response.refresh_token);
        localStorage.setItem('bunsen_profile', JSON.stringify(response.profile));
        setLocation('/account');
      },
      onError: error => setFormError(errorMessage(error)),
    });
  };

  return (
    <div className="grain grid min-h-[100dvh] bg-[var(--ink)] text-[var(--paper)] md:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[var(--tomato)] p-10 md:flex md:flex-col md:justify-between">
        <Wordmark />
        <div className="relative z-10"><p className="mono-face text-[10px] uppercase tracking-[.2em] text-[var(--acid)]">{isLogin ? 'Welcome back' : 'Pull up a chair'}</p><h1 className="display-face mt-6 text-[clamp(5rem,10vw,10rem)] leading-[.76] text-[var(--paper)]">{isLogin ? <>BACK<br />TO THE<br /><span className="text-[var(--acid)]">GRILL.</span></> : <>JOIN<br />THE<br /><span className="text-[var(--acid)]">QUEUE.</span></>}</h1></div>
        <div className="flex items-end justify-between border-t border-[var(--paper)]/25 pt-5"><span className="mono-face text-[10px] uppercase tracking-[.16em] text-[var(--paper)]/60">Bunsen / Dublin</span><span className="display-face text-3xl">B.</span></div>
      </section>
      <section className="flex flex-col bg-[var(--ink)] p-5 md:p-10">
        <div className="flex items-center justify-between md:hidden"><Wordmark /><Link href="/" className="text-[var(--paper)]/60" data-testid="link-auth-home-mobile"><ArrowLeft size={20} /></Link></div>
        <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center py-14">
          <Link href="/" className="mb-12 hidden items-center gap-2 mono-face text-[10px] uppercase tracking-[.18em] text-[var(--paper)]/45 transition-colors hover:text-[var(--acid)] md:inline-flex" data-testid="link-auth-home"><ArrowLeft size={15} /> Return to counter</Link>
          <p className="mono-face text-[10px] uppercase tracking-[.2em] text-[var(--acid)]">{isLogin ? 'Customer sign in' : 'New customer'}</p>
          <h2 className="display-face mt-4 text-5xl leading-[.86] md:text-6xl">{isLogin ? 'GOOD TO SEE YOU.' : 'MAKE IT OFFICIAL.'}</h2>
          <p className="mt-5 max-w-sm text-sm leading-6 text-[var(--paper)]/55">{isLogin ? 'Sign in to keep your details close and your next order moving fast.' : 'Create an account for faster ordering at the counter.'}</p>
          <form onSubmit={submit} className="mt-10 space-y-6" noValidate>
            <div><label htmlFor="email" className="mono-face mb-2 block text-[10px] uppercase tracking-[.17em] text-[var(--paper)]/55">Email address</label><input id="email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" className="w-full border-b border-[var(--paper)]/30 bg-transparent px-0 py-3 text-base text-[var(--paper)] outline-none transition-colors placeholder:text-[var(--paper)]/25 focus:border-[var(--acid)]" placeholder="you@example.com" data-testid="input-auth-email" /></div>
            <div><label htmlFor="password" className="mono-face mb-2 block text-[10px] uppercase tracking-[.17em] text-[var(--paper)]/55">Password</label><div className="flex items-center border-b border-[var(--paper)]/30 focus-within:border-[var(--acid)]"><input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete={isLogin ? 'current-password' : 'new-password'} className="w-full bg-transparent px-0 py-3 text-base text-[var(--paper)] outline-none placeholder:text-[var(--paper)]/25" placeholder="At least 6 characters" data-testid="input-auth-password" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="p-2 text-[var(--paper)]/45 hover:text-[var(--acid)]" aria-label={showPassword ? 'Hide password' : 'Show password'} data-testid="button-toggle-password">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
            {formError && <div className="flex gap-3 border border-[var(--tomato)]/60 bg-[var(--tomato)]/10 p-3 text-sm text-[var(--paper)]" data-testid="error-auth"><CircleAlert className="mt-0.5 shrink-0 text-[var(--tomato)]" size={16} /><span>{formError}</span></div>}
            <button type="submit" disabled={mutation.isPending} className="group flex w-full items-center justify-center gap-3 bg-[var(--acid)] px-5 py-4 mono-face text-[11px] uppercase tracking-[.18em] text-[var(--ink)] transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60" data-testid="button-submit-auth">{mutation.isPending ? 'Working...' : isLogin ? 'Sign in' : 'Create account'} {!mutation.isPending && <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}</button>
          </form>
          <p className="mt-9 text-center text-sm text-[var(--paper)]/45">{isLogin ? 'New around here?' : 'Already have an account?'} <Link href={isLogin ? '/signup' : '/login'} className="ml-1 text-[var(--acid)] underline underline-offset-4" data-testid="link-auth-switch">{isLogin ? 'Create an account' : 'Sign in'}</Link></p>
        </div>
        <div className="flex justify-between border-t border-white/10 pt-5 mono-face text-[9px] uppercase tracking-[.16em] text-[var(--paper)]/30"><span>Serious food / no fuss</span><span>01—{isLogin ? '02' : '03'}</span></div>
      </section>
    </div>
  );
}