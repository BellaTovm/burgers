import { ArrowLeft, SearchX } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="grain flex min-h-[100dvh] items-center bg-[var(--tomato)] px-5 text-[var(--paper)] md:px-10">
      <div className="mx-auto w-full max-w-[1100px]">
        <div className="flex items-center justify-between border-b border-[var(--paper)]/25 pb-6">
          <Link href="/" className="display-face text-2xl tracking-[-.08em]" data-testid="link-not-found-wordmark">BUNSEN<span className="text-[var(--acid)]">.</span></Link>
          <span className="mono-face text-[10px] uppercase tracking-[.18em] text-[var(--paper)]/60">Error 404</span>
        </div>
        <div className="grid gap-12 py-20 md:grid-cols-[1fr_.7fr] md:items-end md:py-28">
          <div><SearchX size={32} className="text-[var(--acid)]" /><h1 className="display-face mt-8 text-[clamp(5rem,13vw,12rem)] leading-[.76]">WRONG<br /><span className="text-[var(--acid)]">TURN.</span></h1></div>
          <div><p className="max-w-xs text-base leading-7 text-[var(--paper)]/75">This page isn’t on today’s menu. Let’s get you back to something good.</p><Link href="/" className="mt-8 inline-flex items-center gap-3 border-b-2 border-[var(--acid)] pb-2 mono-face text-[10px] uppercase tracking-[.18em] text-[var(--acid)]" data-testid="link-not-found-home"><ArrowLeft size={15} /> Back to the counter</Link></div>
        </div>
        <div className="flex justify-between border-t border-[var(--paper)]/25 pt-5 mono-face text-[9px] uppercase tracking-[.16em] text-[var(--paper)]/50"><span>Good food / no fuss</span><span>B.</span></div>
      </div>
    </div>
  );
}
