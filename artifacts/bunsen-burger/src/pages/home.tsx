import { ArrowDown, ArrowRight, Check, CircleAlert, LoaderCircle, Minus, Plus, ShoppingBag, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useHealthCheck, useListCategories, useListProducts } from '@workspace/api-client-react';
import type { Category, Product } from '@workspace/api-client-react';
import heroBurger from '@assets/generated_images/bunsen-hero-burger.png';
import { Footer, SiteHeader } from '@/components/site-header';
import { addToCart, cartCount, cartTotal, changeQuantity, useCart, type CartLine } from '@/lib/cart';

function ProductSkeleton() {
  return <div className="animate-pulse border-t border-[var(--ink)]/20 pt-5"><div className="h-5 w-2/3 bg-[var(--ink)]/10" /><div className="mt-3 h-3 w-1/2 bg-[var(--ink)]/10" /><div className="mt-6 h-9 w-full bg-[var(--ink)]/10" /></div>;
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: (product: Product) => void }) {
  const image = product.image_url;
  return (
    <article className="menu-card group border-t border-[var(--ink)]/25 pt-5" data-testid={`card-product-${product.id}`}>
      <div className="relative mb-5 aspect-[4/3] overflow-hidden bg-[#d7d0c0]">
        {image ? (
          <img src={image} alt={product.name} className="menu-card-image h-full w-full object-cover" data-testid={`img-product-${product.id}`} />
        ) : (
          <div className="flex h-full items-end justify-between bg-[var(--tomato)] p-5 text-[var(--paper)]">
            <span className="display-face max-w-[70%] text-4xl leading-[.84]">{product.name}</span>
            <span className="mono-face text-xs">B.</span>
          </div>
        )}
        {!product.is_available && <div className="absolute inset-0 flex items-center justify-center bg-[var(--ink)]/75"><span className="mono-face border border-[var(--paper)] px-3 py-2 text-[10px] uppercase tracking-[.16em] text-[var(--paper)]">Off the grill</span></div>}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="display-face text-2xl leading-none">{product.name}</h3>
          {product.description && <p className="mt-2 max-w-[250px] text-sm leading-5 text-[var(--ink)]/60">{product.description}</p>}
        </div>
        <span className="mono-face shrink-0 pt-1 text-sm">€{product.price.toFixed(2)}</span>
      </div>
      <button type="button" disabled={!product.is_available || product.stock_count < 1} onClick={() => onAdd(product)} className="mt-5 flex w-full items-center justify-center gap-2 border border-[var(--ink)] px-4 py-3 mono-face text-[10px] uppercase tracking-[.16em] transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)] disabled:cursor-not-allowed disabled:border-[var(--ink)]/20 disabled:text-[var(--ink)]/35" data-testid={`button-add-product-${product.id}`}>
        <Plus size={15} /> {product.is_available && product.stock_count > 0 ? 'Add to bag' : 'Unavailable'}
      </button>
    </article>
  );
}

function CartPanel({ items, onChange, onClose, onCheckout }: { items: CartLine[]; onChange: (id: string, amount: number) => void; onClose: () => void; onCheckout: () => void }) {
  const total = cartTotal(items);
  return (
    <aside className="fixed inset-x-3 bottom-3 z-30 border-2 border-[var(--ink)] bg-[var(--acid)] p-5 shadow-[8px_8px_0_var(--ink)] md:inset-x-auto md:right-7 md:top-24 md:bottom-auto md:w-[360px]" data-testid="panel-cart">
      <div className="flex items-start justify-between border-b border-[var(--ink)]/25 pb-4">
        <div><p className="mono-face text-[10px] uppercase tracking-[.18em]">Your bag</p><p className="display-face mt-1 text-3xl">{items.length ? `${cartCount(items)} items` : 'Nothing yet'}</p></div>
        <button onClick={onClose} className="mono-face text-[10px] uppercase tracking-[.15em] underline" data-testid="button-close-cart">Close</button>
      </div>
      {items.length ? (
        <>
          <div className="max-h-56 space-y-4 overflow-y-auto py-4">
            {items.map(item => <div className="flex items-center justify-between gap-3" key={item.product_id} data-testid={`row-cart-${item.product_id}`}><div><p className="font-semibold">{item.name}</p><p className="mono-face text-[10px]">€{(item.unit_price * item.quantity).toFixed(2)}</p></div><div className="flex items-center gap-2 border border-[var(--ink)] px-2 py-1"><button onClick={() => onChange(item.product_id, -1)} aria-label={`Remove one ${item.name}`} data-testid={`button-remove-cart-${item.product_id}`}><Minus size={14} /></button><span className="mono-face text-xs">{item.quantity}</span><button onClick={() => onChange(item.product_id, 1)} aria-label={`Add one ${item.name}`} data-testid={`button-increase-cart-${item.product_id}`}><Plus size={14} /></button></div></div>)}
          </div>
          <div className="flex items-center justify-between border-t border-[var(--ink)]/25 pt-4"><span className="mono-face text-[10px] uppercase tracking-[.16em]">Total</span><span className="display-face text-2xl">€{total.toFixed(2)}</span></div>
          <button type="button" onClick={onCheckout} className="mt-4 flex w-full items-center justify-center gap-2 bg-[var(--ink)] px-4 py-3 mono-face text-[10px] uppercase tracking-[.16em] text-[var(--paper)] transition-transform hover:-translate-y-0.5" data-testid="button-checkout">Continue to checkout <ArrowRight size={15} /></button>
        </>
      ) : <p className="py-7 text-sm text-[var(--ink)]/65">Pick a burger. We’ll keep it warm.</p>}
    </aside>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const cart = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const categoriesQuery = useListCategories();
  const productsQuery = useListProducts();
  const healthQuery = useHealthCheck();
  const categories = categoriesQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const filtered = useMemo(() => activeCategory === 'all' ? products : products.filter(product => product.category_id === activeCategory), [activeCategory, products]);
  const categoryLabel = (id: string) => categories.find(category => category.id === id)?.name ?? 'Menu';

  const handleAdd = (product: Product) => {
    addToCart(product);
    setCartOpen(true);
  };

  return (
    <div className="grain min-h-[100dvh] bg-[var(--paper)]">
      <section className="relative min-h-[700px] overflow-hidden bg-[var(--ink)] text-[var(--paper)]">
        <SiteHeader />
        <div className="mx-auto grid max-w-[1440px] items-end gap-10 px-5 pb-14 pt-36 md:min-h-[700px] md:grid-cols-[1fr_1.15fr] md:px-10 md:pb-16 md:pt-32">
          <div className="relative z-10 reveal">
            <p className="mono-face mb-6 flex items-center gap-3 text-[10px] uppercase tracking-[.2em] text-[var(--acid)]"><span className="h-2 w-2 bg-[var(--acid)]" /> Dublin’s neighborhood burger counter</p>
            <h1 className="display-face max-w-[650px] text-[clamp(4.7rem,11vw,10.5rem)] leading-[.78] text-[var(--paper)]">BURGERS<br /><span className="text-[var(--acid)]">DONE</span><br />PROPER.</h1>
            <p className="mt-9 max-w-sm text-base leading-6 text-[var(--paper)]/65">Smash-grilled, cheese-laden, and served without the ceremony. Made for right now.</p>
            <a href="#menu" className="mt-8 inline-flex items-center gap-3 border-b-2 border-[var(--acid)] pb-2 mono-face text-[11px] uppercase tracking-[.18em] text-[var(--acid)] transition-gap hover:gap-5" data-testid="link-hero-menu">See the menu <ArrowDown size={16} /></a>
          </div>
          <div className="relative reveal reveal-delay-2">
            <div className="absolute -left-4 top-8 z-10 hidden h-28 w-28 -rotate-12 items-center justify-center rounded-full bg-[var(--acid)] text-center text-[var(--ink)] md:flex"><span className="display-face text-lg leading-[.8]">HOT<br />OFF<br />THE<br />GRILL</span></div>
            <div className="aspect-[1/1] overflow-hidden bg-[#b2aa98] md:aspect-[4/3]">
              <img src={heroBurger} alt="Bunsen cheeseburger fresh from the grill" className="h-full w-full object-cover mix-blend-multiply transition-transform duration-700 hover:scale-105" data-testid="img-hero-burger" />
            </div>
            <div className="absolute -bottom-4 right-3 bg-[var(--tomato)] px-4 py-3 mono-face text-[10px] uppercase tracking-[.16em] text-[var(--paper)] md:right-10">Est. on Thomas St.</div>
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-b-2 border-[var(--ink)] bg-[var(--acid)] py-3">
        <div className="marquee-track flex w-max gap-10 whitespace-nowrap"><span className="display-face text-2xl">SERIOUS BURGERS / FAST HANDS / GOOD MOOD / SERIOUS BURGERS / FAST HANDS / GOOD MOOD /</span><span className="display-face text-2xl">SERIOUS BURGERS / FAST HANDS / GOOD MOOD / SERIOUS BURGERS / FAST HANDS / GOOD MOOD /</span></div>
      </div>

      <main id="menu" className="mx-auto max-w-[1440px] px-5 py-20 md:px-10 md:py-28">
        <div className="grid gap-8 md:grid-cols-[.65fr_1.35fr] md:gap-16">
          <div className="md:sticky md:top-10 md:self-start">
            <p className="mono-face text-[10px] uppercase tracking-[.22em] text-[var(--tomato)]">01 / The menu</p>
            <h2 className="display-face mt-4 max-w-[420px] text-6xl leading-[.83] md:text-8xl">PICK<br />YOUR<br /><span className="text-[var(--tomato)]">PLAYER.</span></h2>
            <p className="mt-7 max-w-xs text-sm leading-6 text-[var(--ink)]/60">Everything we serve starts with the grill. Choose your weapon and we’ll do the rest.</p>
            <div className="mt-10 flex flex-wrap gap-2" role="tablist" aria-label="Menu categories">
              <button onClick={() => setActiveCategory('all')} className={`border px-3 py-2 mono-face text-[10px] uppercase tracking-[.12em] transition-colors ${activeCategory === 'all' ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]' : 'border-[var(--ink)]/25 hover:border-[var(--ink)]'}`} data-testid="button-category-all">All</button>
              {categories.map((category: Category) => <button key={category.id} onClick={() => setActiveCategory(category.id)} className={`border px-3 py-2 mono-face text-[10px] uppercase tracking-[.12em] transition-colors ${activeCategory === category.id ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]' : 'border-[var(--ink)]/25 hover:border-[var(--ink)]'}`} data-testid={`button-category-${category.id}`}>{category.name}</button>)}
            </div>
            <div className="mt-8 flex items-center gap-2 text-[var(--ink)]/50" data-testid="status-health">
              {healthQuery.isLoading ? <LoaderCircle size={14} className="animate-spin" /> : healthQuery.isError ? <CircleAlert size={14} className="text-[var(--tomato)]" /> : <Check size={14} className="text-green-700" />}
              <span className="mono-face text-[9px] uppercase tracking-[.13em]">{healthQuery.isError ? 'Counter connection issue' : 'Counter online'}</span>
            </div>
          </div>
          <div>
            {categoriesQuery.isError && <div className="mb-7 border-l-2 border-[var(--tomato)] bg-[var(--tomato)]/10 p-4 text-sm" data-testid="error-categories">We couldn’t load menu categories. Try refreshing the page.</div>}
            {productsQuery.isError && <div className="border-l-2 border-[var(--tomato)] bg-[var(--tomato)]/10 p-5 text-sm" data-testid="error-products">We couldn’t load the menu right now. The grill is still on — please try again.</div>}
            {productsQuery.isLoading ? <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2"><ProductSkeleton /><ProductSkeleton /><ProductSkeleton /><ProductSkeleton /></div> : productsQuery.isError ? null : filtered.length === 0 ? <div className="border-t border-[var(--ink)]/25 py-14" data-testid="empty-products"><Zap size={22} /><h3 className="display-face mt-4 text-3xl">Nothing on this shelf.</h3><p className="mt-2 text-sm text-[var(--ink)]/60">Try another category. We keep the menu tight.</p></div> : <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2">{filtered.map(product => <div key={product.id}><p className="mb-3 mono-face text-[9px] uppercase tracking-[.16em] text-[var(--tomato)]">{categoryLabel(product.category_id)}</p><ProductCard product={product} onAdd={handleAdd} /></div>)}</div>}
          </div>
        </div>
      </main>

      <section id="story" className="border-y-2 border-[var(--ink)] bg-[var(--tomato)] px-5 py-20 text-[var(--paper)] md:px-10 md:py-28">
        <div className="mx-auto grid max-w-[1440px] gap-12 md:grid-cols-[1.2fr_.8fr] md:items-end">
          <div><p className="mono-face text-[10px] uppercase tracking-[.22em] text-[var(--acid)]">02 / Our counter</p><h2 className="display-face mt-5 max-w-4xl text-6xl leading-[.82] md:text-[8.5rem]">NO SHORT<br />CUTS. JUST<br /><span className="text-[var(--acid)]">GOOD BEEF.</span></h2></div>
          <div className="md:pb-2"><p className="max-w-sm text-base leading-7 text-[var(--paper)]/75">We grind our own beef, toast every bun, and keep the queue moving. That’s the whole philosophy. A few good ingredients, treated properly.</p><Link href="/#menu" className="mt-8 inline-flex items-center gap-3 border-b border-[var(--acid)] pb-2 mono-face text-[10px] uppercase tracking-[.18em] text-[var(--acid)]" data-testid="link-story-menu">Back to the menu <ArrowRight size={15} /></Link></div>
        </div>
      </section>

      <Footer />
      {cartOpen && <CartPanel items={cart} onChange={changeQuantity} onClose={() => setCartOpen(false)} onCheckout={() => setLocation('/checkout')} />}
      {!cartOpen && cart.length > 0 && <button onClick={() => setCartOpen(true)} className="fixed bottom-5 right-5 z-20 flex items-center gap-3 border-2 border-[var(--ink)] bg-[var(--acid)] px-5 py-4 shadow-[5px_5px_0_var(--ink)] transition-transform hover:-translate-y-1" data-testid="button-open-cart"><ShoppingBag size={18} /><span className="mono-face text-[10px] uppercase tracking-[.15em]">Bag ({cartCount(cart)})</span></button>}
    </div>
  );
}