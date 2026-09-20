-- =====================================================================
-- 0002_place_order.sql — order placement
--
-- orders had no INSERT policy, so nobody could place an order at all.
--
-- The obvious fix — `for insert with check (customer_id = auth.uid())` —
-- is WRONG here. It would let a client choose its own total_price and
-- status, so anyone could order EUR 200 of food for EUR 0.01. It also
-- can't touch products.stock_count, which has no UPDATE policy.
--
-- Instead, order creation goes through one SECURITY DEFINER function that
-- is the ONLY write path into orders. It prices every line from the
-- database, decrements stock, and inserts the order in a single
-- transaction. No INSERT policy is added, so PostgREST still refuses
-- direct writes to orders — the function is the sole way in.
-- =====================================================================

create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists orders_created_at_idx  on public.orders (created_at desc);

create or replace function public.place_order(
  p_items            jsonb,
  p_customer_name    text,
  p_customer_phone   text,
  p_delivery_address text
)
returns public.orders
language plpgsql
security definer
-- Pinned: an unqualified search_path in a SECURITY DEFINER function lets a
-- caller shadow the objects it references.
set search_path = public, pg_temp
as $$
declare
  v_user_id  uuid := auth.uid();
  v_total    numeric := 0;
  v_items    jsonb := '[]'::jsonb;
  v_line     record;
  v_product  public.products%rowtype;
  v_order    public.orders;
begin
  -- Account-required checkout. customer_id is nullable in the schema so
  -- guest orders remain possible later, but nothing may create one today.
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'MISSING_NAME' using errcode = '22023';
  end if;
  if p_customer_phone is null or btrim(p_customer_phone) = '' then
    raise exception 'MISSING_PHONE' using errcode = '22023';
  end if;
  if p_delivery_address is null or btrim(p_delivery_address) = '' then
    raise exception 'MISSING_ADDRESS' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_ORDER' using errcode = '22023';
  end if;

  -- Duplicate lines for the same product are merged, and rows are locked in
  -- a stable product_id order so two concurrent orders cannot deadlock by
  -- grabbing the same products in opposite sequence.
  for v_line in
    select (value->>'product_id')::uuid                      as product_id,
           sum(coalesce((value->>'quantity')::int, 0))::int  as quantity
    from jsonb_array_elements(p_items)
    group by 1
    order by 1
  loop
    if v_line.quantity < 1 then
      raise exception 'INVALID_QUANTITY' using errcode = '22023';
    end if;

    select * into v_product
    from public.products
    where id = v_line.product_id
    for update;

    if not found then
      raise exception 'PRODUCT_NOT_FOUND:%', v_line.product_id using errcode = '22023';
    end if;

    if not coalesce(v_product.is_available, false) then
      raise exception 'PRODUCT_UNAVAILABLE:%', v_product.name using errcode = '22023';
    end if;

    if coalesce(v_product.stock_count, 0) < v_line.quantity then
      raise exception 'INSUFFICIENT_STOCK:%', v_product.name using errcode = '22023';
    end if;

    update public.products
       set stock_count = stock_count - v_line.quantity
     where id = v_product.id;

    v_total := v_total + (v_product.price * v_line.quantity);

    -- name and unit_price are snapshotted so a past order still reads
    -- correctly after the menu is renamed or repriced.
    v_items := v_items || jsonb_build_object(
      'product_id', v_product.id,
      'name',       v_product.name,
      'unit_price', round(v_product.price, 2),
      'quantity',   v_line.quantity,
      'line_total', round(v_product.price * v_line.quantity, 2)
    );
  end loop;

  insert into public.orders (
    customer_id, customer_name, customer_phone,
    delivery_address, items, total_price, status
  )
  values (
    v_user_id, btrim(p_customer_name), btrim(p_customer_phone),
    btrim(p_delivery_address), v_items, round(v_total, 2), 'pending'
  )
  returning * into v_order;

  return v_order;
end;
$$;

-- Account-required: anon may not call this.
revoke all on function public.place_order(jsonb, text, text, text) from public;
revoke all on function public.place_order(jsonb, text, text, text) from anon;
grant execute on function public.place_order(jsonb, text, text, text) to authenticated;
