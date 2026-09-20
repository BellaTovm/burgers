import { ArrowLeft, ArrowRight, CircleAlert, CircleCheck, Minus, Plus, ShoppingBag } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useCreateOrder } from '@workspace/api-client-react';
import type { Order } from '@workspace/api-client-react';
import { Wordmark } from '@/components/site-header';
import { cartTotal, changeQuantity, clearCart, useCart } from '@/lib/cart';
import { isSignedIn } from '@/lib/session';

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message.replace(/^HTTP \d+ [^:]+:\s*/, '');
  return 'We couldn’t place that order. Please try again.';
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain min-h-[100dvh] bg-[var(--paper)] text-[var(--ink)]">
      <header className="border-b-2 border-[var(--ink)] bg-[var(--ink)] px-5 py-5 text-[var(--paper)] md:px-10">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between">
          <Wordmark />
          <Link href="/" className="inline-flex items-center gap-2 mono-face text-[10px] uppercase tracking-[.17em] text-[var(--paper)]/65 hover:text-[var(--acid)]" data-testid="link-checkout-back">
            <ArrowLeft size={15} /> Back to menu
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-5 py-14 md:px-10 md:py-20">{children}</main>
    </div>
  );
}

function Placed({ order }: { order: Order }) {
  return (
    <div data-testid="view-order-placed">
      <p className="mono-face text-[10px] uppercase tracking-[.22em] text-[var(--tomato)]">Order received</p>
      <h1 className="display-face mt-4 text-6xl leading-[.82] md:text-8xl">ON THE<br /><span className="text-[var(--tomato)]">GRILL.</span></h1>
      <div className="mt-10 grid gap-6 md:grid-cols-[1.1fr_.9fr]">
        <div className="border border-[var(--ink)]/25 p-6">
          <div className="flex items-center gap-3 border-b border-[var(--ink)]/15 pb-5">
            <CircleCheck className="text-[var(--tomato)]" size={20} />
            <div>
              <p className="mono-face text-[9px] uppercase tracking-[.15em] text-[var(--ink)]/45">Order reference</p>
              <p className="mt-1 mono-face text-sm" data-testid="text-order-id">{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <ul className="mt-5 space-y-3">
            {order.items.map((line) => (
              <li key={line.product_id} className="flex items-center justify-between text-sm">
                <span>{line.quantity} × {line.name}</span>
                <span className="mono-face text-xs">€{line.line_total.toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center justify-between border-t border-[var(--ink)]/15 pt-5">
            <span className="mono-face text-[10px] uppercase tracking-[.16em]">Total paid on delivery</span>
            <span className="display-face text-2xl" data-testid="text-order-total">€{order.total_price.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex flex-col justify-between bg-[var(--acid)] p-6">
          <div>
            <p className="mono-face text-[10px] uppercase tracking-[.18em]">Status</p>
            <p className="display-face mt-4 text-5xl leading-[.85] capitalize" data-testid="text-order-status">{order.status}</p>
            <p className="mt-5 max-w-xs text-sm leading-6 text-[var(--ink)]/70">
              We’ll ring {order.customer_phone} if there’s any problem. Delivering to {order.delivery_address}.
            </p>
          </div>
          <Link href="/account" className="mt-8 inline-flex items-center gap-3 border-b-2 border-[var(--ink)] pb-2 mono-face text-[10px] uppercase tracking-[.17em]" data-testid="link-order-history">
            See your orders <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const cart = useCart();
  const signedIn = isSignedIn();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState('');
  const [placed, setPlaced] = useState<Order | null>(null);
  const createOrder = useCreateOrder();
  const total = cartTotal(cart);

  if (placed) {
    return <Shell><Placed order={placed} /></Shell>;
  }

  if (!signedIn) {
    return (
      <Shell>
        <div data-testid="view-checkout-signin">
          <p className="mono-face text-[10px] uppercase tracking-[.22em] text-[var(--tomato)]">Almost there</p>
          <h1 className="display-face mt-4 text-6xl leading-[.82] md:text-8xl">SIGN IN<br />TO ORDER.</h1>
          <p className="mt-6 max-w-sm text-sm leading-6 text-[var(--ink)]/60">
            We keep your order history against your account, so you’ll need to be signed in to send this one to the kitchen. Your bag is saved.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/login" className="inline-flex items-center gap-3 bg-[var(--ink)] px-5 py-4 mono-face text-[10px] uppercase tracking-[.17em] text-[var(--paper)]" data-testid="link-checkout-login">
              Sign in <ArrowRight size={15} />
            </Link>
            <Link href="/signup" className="border-b border-[var(--ink)] pb-1 mono-face text-[10px] uppercase tracking-[.17em]" data-testid="link-checkout-signup">
              Create an account
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  if (cart.length === 0) {
    return (
      <Shell>
        <div data-testid="view-checkout-empty">
          <ShoppingBag size={26} />
          <h1 className="display-face mt-6 text-6xl leading-[.82] md:text-8xl">YOUR BAG<br />IS EMPTY.</h1>
          <p className="mt-6 max-w-sm text-sm leading-6 text-[var(--ink)]/60">Nothing to send to the kitchen yet.</p>
          <Link href="/#menu" className="mt-8 inline-flex items-center gap-3 bg-[var(--ink)] px-5 py-4 mono-face text-[10px] uppercase tracking-[.17em] text-[var(--paper)]" data-testid="link-checkout-menu">
            Back to the menu <ArrowRight size={15} />
          </Link>
        </div>
      </Shell>
    );
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    if (!name.trim()) { setFormError('Enter the name for the order.'); return; }
    if (!phone.trim()) { setFormError('Enter a phone number we can reach you on.'); return; }
    if (!address.trim()) { setFormError('Enter a delivery address.'); return; }

    createOrder.mutate(
      {
        data: {
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          delivery_address: address.trim(),
          // Only ids and quantities. The server prices every line from the
          // database, so nothing here can influence what the order costs.
          items: cart.map((line) => ({ product_id: line.product_id, quantity: line.quantity })),
        },
      },
      {
        onSuccess: (order) => { clearCart(); setPlaced(order); },
        onError: (error) => setFormError(errorMessage(error)),
      },
    );
  };

  const field = 'w-full border-b border-[var(--ink)]/30 bg-transparent px-0 py-3 text-base outline-none transition-colors placeholder:text-[var(--ink)]/30 focus:border-[var(--tomato)]';
  const label = 'mono-face mb-2 block text-[10px] uppercase tracking-[.17em] text-[var(--ink)]/55';

  return (
    <Shell>
      <p className="mono-face text-[10px] uppercase tracking-[.22em] text-[var(--tomato)]">03 / Checkout</p>
      <h1 className="display-face mt-4 text-6xl leading-[.82] md:text-8xl">SEND IT<br />TO THE<br /><span className="text-[var(--tomato)]">KITCHEN.</span></h1>

      <div className="mt-12 grid gap-10 md:grid-cols-[1.1fr_.9fr] md:gap-16">
        <form onSubmit={submit} className="space-y-7" noValidate data-testid="form-checkout">
          <div>
            <label htmlFor="name" className={label}>Name for the order</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={field} placeholder="Who's collecting it" data-testid="input-order-name" />
          </div>
          <div>
            <label htmlFor="phone" className={label}>Phone number</label>
            <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" className={field} placeholder="So the driver can reach you" data-testid="input-order-phone" />
          </div>
          <div>
            <label htmlFor="address" className={label}>Delivery address</label>
            <textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" rows={3} className={`${field} resize-none`} placeholder="Street, area, Eircode" data-testid="input-order-address" />
          </div>

          {formError && (
            <div className="flex gap-3 border-l-2 border-[var(--tomato)] bg-[var(--tomato)]/10 p-4 text-sm" data-testid="error-checkout">
              <CircleAlert className="mt-0.5 shrink-0 text-[var(--tomato)]" size={16} />
              <span>{formError}</span>
            </div>
          )}

          <button type="submit" disabled={createOrder.isPending} className="group flex w-full items-center justify-center gap-3 bg-[var(--ink)] px-5 py-4 mono-face text-[11px] uppercase tracking-[.18em] text-[var(--paper)] transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60" data-testid="button-place-order">
            {createOrder.isPending ? 'Sending...' : `Place order — €${total.toFixed(2)}`}
            {!createOrder.isPending && <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}
          </button>
          <p className="text-xs leading-5 text-[var(--ink)]/45">Pay the driver on delivery. We’ll confirm by phone if anything is off.</p>
        </form>

        <aside className="md:sticky md:top-10 md:self-start" data-testid="panel-order-summary">
          <p className="mono-face text-[10px] uppercase tracking-[.18em] text-[var(--ink)]/45">Your bag</p>
          <ul className="mt-6 space-y-5">
            {cart.map((line) => (
              <li key={line.product_id} className="flex items-center justify-between gap-3 border-b border-[var(--ink)]/15 pb-5" data-testid={`row-summary-${line.product_id}`}>
                <div>
                  <p className="font-semibold">{line.name}</p>
                  <p className="mono-face text-[10px] text-[var(--ink)]/55">€{(line.unit_price * line.quantity).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2 border border-[var(--ink)] px-2 py-1">
                  <button type="button" onClick={() => changeQuantity(line.product_id, -1)} aria-label={`Remove one ${line.name}`} data-testid={`button-summary-less-${line.product_id}`}><Minus size={14} /></button>
                  <span className="mono-face text-xs">{line.quantity}</span>
                  <button type="button" onClick={() => changeQuantity(line.product_id, 1)} aria-label={`Add one ${line.name}`} data-testid={`button-summary-more-${line.product_id}`}><Plus size={14} /></button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between pt-2">
            <span className="mono-face text-[10px] uppercase tracking-[.16em]">Total</span>
            <span className="display-face text-3xl" data-testid="text-summary-total">€{total.toFixed(2)}</span>
          </div>
        </aside>
      </div>
    </Shell>
  );
}
