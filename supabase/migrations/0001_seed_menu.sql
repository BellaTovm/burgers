-- =====================================================================
-- 0001_seed_menu.sql — initial menu content
--
-- categories and products were both empty, so the storefront rendered
-- "Nothing on this shelf." to every visitor. This seeds real rows into
-- the existing Supabase tables; the app reads them live, no mock data.
--
-- Safe to re-run: categories upsert on their unique slug, and each
-- product is inserted only when no product of that name exists.
--
-- image_url is deliberately left NULL. The product-images bucket is
-- empty, and inventing URLs would render broken images — the UI already
-- has a designed fallback (a tomato panel with the product name). Real
-- images arrive with the admin uploader.
--
-- NOTE ON STOCK: /products filters `stock_count > 0`, so a row with zero
-- stock is invisible no matter what is_available says. Every item below
-- is seeded with real stock for that reason.
-- =====================================================================

insert into public.categories (name, slug) values
  ('Burgers',       'burgers'),
  ('Fries & Sides', 'fries-sides'),
  ('Drinks',        'drinks'),
  ('Desserts',      'desserts')
on conflict (slug) do nothing;

insert into public.products
  (category_id, name, description, price, stock_count, is_available)
select c.id, v.name, v.description, v.price::numeric, v.stock::int, true
from (values
  -- Burgers
  ('burgers', 'The Classic',
   'Single smash patty, aged cheddar, pickles, onion and house sauce in a toasted brioche bun.',
   9.50, 60),
  ('burgers', 'Double Stack',
   'Two smash patties, double cheddar, pickles and house sauce. The one to beat.',
   12.50, 45),
  ('burgers', 'Bacon & Blue',
   'Smash patty, streaky bacon, blue cheese sauce and crisp shallots.',
   13.00, 30),
  ('burgers', 'Onion Smash',
   'Patty pressed onto a bed of onions until the edges caramelise, with cheddar and mustard.',
   11.00, 35),
  ('burgers', 'Buttermilk Chicken',
   'Buttermilk-brined chicken thigh, fried to order, with slaw and chipotle mayo.',
   11.50, 40),
  ('burgers', 'Halloumi Stack',
   'Griddled halloumi, roast red pepper, rocket and lemon aioli. Vegetarian.',
   10.50, 25),
  ('burgers', 'Black Bean Burger',
   'House black bean and smoked paprika patty, avocado and pickled red onion. Vegan.',
   10.50, 25),

  -- Fries & Sides
  ('fries-sides', 'Skinny Fries',
   'Thin cut, twice fried, salted the moment they leave the oil.',
   3.80, 120),
  ('fries-sides', 'Chunky Chips',
   'Thick cut, fluffy inside, crisp outside.',
   4.20, 90),
  ('fries-sides', 'Cheese & Bacon Fries',
   'Skinny fries under melted cheddar sauce and crumbled bacon.',
   6.50, 50),
  ('fries-sides', 'Truffle Parmesan Fries',
   'Skinny fries tossed with truffle oil, parmesan and parsley.',
   6.80, 40),
  ('fries-sides', 'Onion Rings',
   'Beer-battered, six to a portion, with garlic mayo.',
   4.50, 55),
  ('fries-sides', 'House Slaw',
   'White cabbage, carrot and apple in a light buttermilk dressing.',
   3.00, 40),
  ('fries-sides', 'Side Salad',
   'Baby leaves, cucumber, radish and a mustard vinaigrette.',
   4.00, 30),

  -- Drinks
  ('drinks', 'Craft Cola',
   'Cane sugar cola, served in the bottle.',
   3.20, 100),
  ('drinks', 'Fresh Lemonade',
   'Pressed lemons, still water, not too sweet.',
   3.50, 70),
  ('drinks', 'Sparkling Water',
   'Irish sparkling water, 330ml.',
   2.50, 100),
  ('drinks', 'Vanilla Milkshake',
   'Thick vanilla shake made with real ice cream.',
   5.50, 40),
  ('drinks', 'Chocolate Milkshake',
   'Thick chocolate shake made with real ice cream.',
   5.50, 40),
  ('drinks', 'Local IPA',
   'Rotating Dublin IPA on the counter fridge, 440ml can.',
   6.00, 48),

  -- Desserts
  ('desserts', 'Salted Caramel Brownie',
   'Dense chocolate brownie, salted caramel, served warm.',
   5.00, 30),
  ('desserts', 'Apple Crumble',
   'Bramley apple, oat crumble topping, pouring cream.',
   5.50, 24)
) as v(slug, name, description, price, stock)
join public.categories c on c.slug = v.slug
where not exists (
  select 1 from public.products p where p.name = v.name
);
