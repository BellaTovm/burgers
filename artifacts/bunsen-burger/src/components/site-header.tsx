import { ArrowRight, CircleUserRound, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { isSignedIn } from '@/lib/session';

export function Wordmark() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2" data-testid="link-home-wordmark">
      <span className="flex h-9 w-9 items-center justify-center bg-[var(--acid)] text-[var(--ink)] text-lg font-bold transition-transform group-hover:-rotate-6">B</span>
      <span className="display-face text-[1.45rem] leading-none text-[var(--paper)]">BUNSEN</span>
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const isHome = location === '/';
  const signedIn = isSignedIn();

  return (
    <header className="absolute inset-x-0 top-0 z-40 border-b border-white/15 bg-[var(--ink)]/95 text-[var(--paper)] backdrop-blur-sm">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 md:px-10">
        <Wordmark />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary navigation">
          <Link href="/#menu" className={`mono-face text-[11px] uppercase tracking-[.17em] transition-colors hover:text-[var(--acid)] ${isHome ? 'text-[var(--acid)]' : 'text-[var(--paper)]/70'}`} data-testid="link-nav-menu">Menu</Link>
          <Link href="/#story" className="mono-face text-[11px] uppercase tracking-[.17em] text-[var(--paper)]/70 transition-colors hover:text-[var(--acid)]" data-testid="link-nav-story">Our counter</Link>
          <Link href="/account" className="inline-flex items-center gap-2 mono-face text-[11px] uppercase tracking-[.17em] text-[var(--paper)]/70 transition-colors hover:text-[var(--acid)]" data-testid="link-nav-account">
            <CircleUserRound size={16} strokeWidth={1.6} />
            <span className={signedIn ? 'text-[var(--acid)]' : undefined}>
              {signedIn ? 'Signed in' : 'Sign in'}
            </span>
          </Link>
          <Link href="/#menu" className="group inline-flex items-center gap-3 bg-[var(--acid)] px-4 py-3 text-[var(--ink)] transition-transform hover:-translate-y-0.5" data-testid="link-nav-order">
            <span className="mono-face text-[11px] font-medium uppercase tracking-[.16em]">Order now</span>
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </nav>
        <button className="flex h-10 w-10 items-center justify-center border border-white/20 md:hidden" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} data-testid="button-mobile-menu">
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-white/15 px-5 py-5 md:hidden" aria-label="Mobile navigation">
          <div className="flex flex-col gap-5">
            <Link href="/#menu" onClick={() => setOpen(false)} className="mono-face text-xs uppercase tracking-[.18em]" data-testid="link-mobile-menu">Menu</Link>
            <Link href="/#story" onClick={() => setOpen(false)} className="mono-face text-xs uppercase tracking-[.18em]" data-testid="link-mobile-story">Our counter</Link>
            <Link href="/account" onClick={() => setOpen(false)} className="mono-face text-xs uppercase tracking-[.18em]" data-testid="link-mobile-account">Account</Link>
          </div>
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-[var(--ink)] px-5 py-12 text-[var(--paper)] md:px-10 md:py-16">
      <div className="mx-auto grid max-w-[1440px] gap-12 md:grid-cols-[1.3fr_.7fr_.7fr]">
        <div>
          <p className="display-face max-w-xl text-5xl leading-[.88] text-[var(--acid)] md:text-7xl">GOOD FOOD.<br />NO FUSS.</p>
          <p className="mt-7 max-w-sm text-sm leading-6 text-[var(--paper)]/60">A neighborhood burger counter, built around a hot grill and the belief that lunch should be the best part of your day.</p>
        </div>
        <div>
          <p className="mono-face mb-4 text-[10px] uppercase tracking-[.2em] text-[var(--paper)]/40">Find us</p>
          <p className="text-sm leading-6">14 Thomas Street<br />Dublin 8<br />D08 XY21</p>
        </div>
        <div>
          <p className="mono-face mb-4 text-[10px] uppercase tracking-[.2em] text-[var(--paper)]/40">Open daily</p>
          <p className="text-sm leading-6">11:30 — 22:00<br />Last order at 21:45</p>
          <Link href="/account" className="mt-6 inline-block border-b border-[var(--acid)] pb-1 mono-face text-[10px] uppercase tracking-[.18em] text-[var(--acid)]" data-testid="link-footer-account">Your account</Link>
        </div>
      </div>
      <div className="mx-auto mt-14 flex max-w-[1440px] items-end justify-between border-t border-white/15 pt-5">
        <span className="mono-face text-[10px] uppercase tracking-[.18em] text-[var(--paper)]/40">© Bunsen Burger 2024</span>
        <span className="display-face text-2xl">B.</span>
      </div>
    </footer>
  );
}