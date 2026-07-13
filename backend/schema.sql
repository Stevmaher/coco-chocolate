-- =========================================================
-- Coco Chocolate — Supabase schema
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- It creates: tables, RLS policies, a Storage bucket for product images,
-- and two RPC functions that replicate the old in-browser "api" logic
-- (create_order / update_order_status), including stock updates.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- TABLES ----------

create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  name_ar     text not null,
  description text default '',
  price       numeric not null default 0,
  category    text not null default 'dark',
  stock       integer not null default 0,
  icon        text default '🍫',
  image       text default '',
  bestseller  boolean not null default false,
  is_new      boolean not null default false,
  featured    boolean not null default false,
  created_at  timestamptz not null default now()
);

create sequence if not exists order_number_seq start 1001;

create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  order_number  integer not null default nextval('order_number_seq'),
  customer_name text not null,
  phone         text not null,
  status        text not null default 'PENDING',
  source        text not null default 'WEBSITE',
  subtotal      numeric not null default 0,
  delivery_fee  numeric not null default 0,
  total         numeric not null default 0,
  status_log    jsonb not null default '[]',
  created_at    timestamptz not null default now()
);

create table if not exists order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  qty        integer not null,
  unit_price numeric not null
);

-- ---------- ROW LEVEL SECURITY ----------

alter table products   enable row level security;
alter table orders     enable row level security;
alter table order_items enable row level security;

-- Products: everyone (including anonymous storefront visitors) can read.
-- Only a logged-in admin (Supabase Auth "authenticated" role) can write.
drop policy if exists products_select_public on products;
create policy products_select_public on products for select using (true);

drop policy if exists products_insert_admin on products;
create policy products_insert_admin on products for insert to authenticated with check (true);

drop policy if exists products_update_admin on products;
create policy products_update_admin on products for update to authenticated using (true) with check (true);

drop policy if exists products_delete_admin on products;
create policy products_delete_admin on products for delete to authenticated using (true);

-- Orders / order_items: only the admin can read or update them directly.
-- Customers never query these tables directly — checkout goes through the
-- create_order() function below (SECURITY DEFINER), so RLS still fully
-- protects the data from anonymous reads.
drop policy if exists orders_select_admin on orders;
create policy orders_select_admin on orders for select to authenticated using (true);

drop policy if exists orders_update_admin on orders;
create policy orders_update_admin on orders for update to authenticated using (true) with check (true);

drop policy if exists order_items_select_admin on order_items;
create policy order_items_select_admin on order_items for select to authenticated using (true);

-- ---------- RPC: create_order (called by the public storefront at checkout) ----------
-- payload shape: { "customerName": "...", "phone": "...", "source": "WEBSITE",
--                   "items": [ { "id": "<product uuid>", "qty": 2, "price": 200 }, ... ] }
create or replace function create_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id     uuid := gen_random_uuid();
  v_subtotal     numeric := 0;
  v_delivery     numeric := 0;
  v_total        numeric := 0;
  v_order_number integer;
  v_item         jsonb;
  v_now          timestamptz := now();
begin
  for v_item in select * from jsonb_array_elements(payload->'items') loop
    v_subtotal := v_subtotal + (v_item->>'price')::numeric * (v_item->>'qty')::integer;
  end loop;
  v_delivery := case when v_subtotal > 0 then 40 else 0 end;
  v_total := v_subtotal + v_delivery;

  insert into orders (id, customer_name, phone, status, source, subtotal, delivery_fee, total, status_log, created_at)
  values (
    v_order_id, payload->>'customerName', payload->>'phone', 'PENDING',
    coalesce(payload->>'source', 'WEBSITE'), v_subtotal, v_delivery, v_total,
    jsonb_build_array(jsonb_build_object('status', 'PENDING', 'at', v_now)), v_now
  )
  returning order_number into v_order_number;

  for v_item in select * from jsonb_array_elements(payload->'items') loop
    insert into order_items (order_id, product_id, qty, unit_price)
    values (v_order_id, (v_item->>'id')::uuid, (v_item->>'qty')::integer, (v_item->>'price')::numeric);

    update products set stock = greatest(0, stock - (v_item->>'qty')::integer)
    where id = (v_item->>'id')::uuid;
  end loop;

  return jsonb_build_object(
    'id', v_order_id, 'orderNumber', v_order_number,
    'customerName', payload->>'customerName', 'phone', payload->>'phone',
    'status', 'PENDING', 'source', coalesce(payload->>'source', 'WEBSITE'),
    'subtotal', v_subtotal, 'deliveryFee', v_delivery, 'total', v_total,
    'createdAt', v_now
  );
end;
$$;

grant execute on function create_order(jsonb) to anon, authenticated;

-- ---------- RPC: update_order_status (admin-only) ----------
create or replace function update_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_was_cancelled boolean;
  v_item record;
begin
  select (status = 'CANCELLED') into v_was_cancelled from orders where id = p_order_id;

  update orders
    set status = p_status,
        status_log = status_log || jsonb_build_object('status', p_status, 'at', now())
    where id = p_order_id;

  if p_status = 'CANCELLED' and coalesce(v_was_cancelled, false) = false then
    for v_item in select product_id, qty from order_items where order_id = p_order_id loop
      update products set stock = stock + v_item.qty where id = v_item.product_id;
    end loop;
  end if;
end;
$$;

-- Only logged-in admins may call this (it changes order status / restores stock).
revoke execute on function update_order_status(uuid, text) from public;
grant execute on function update_order_status(uuid, text) to authenticated;

-- ---------- STORAGE (product images) ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images');

drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects
  for update to authenticated using (bucket_id = 'product-images');

drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'product-images');

-- ---------- SEED DATA (optional — same 7 demo products as the original site) ----------
insert into products (name, name_ar, description, price, category, stock, icon, image, bestseller, is_new, featured) values
('The Signature Box','صندوق التوقيع','16 قطعة مصنوعة يدويًا، متعة خالصة',400,'gifts',24,'📦','https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&q=85&fit=crop',true,false,true),
('Velvet Truffles','كرات الشوكولاتة المخملية','كراميل مملح و ganache داكن',200,'truffles',40,'🍫','https://images.unsplash.com/photo-1548741487-18d363dc4469?w=600&q=85&fit=crop',false,false,false),
('Noir Intense Bar','لوح الداكنة المكثفة','72% كاكاو من الإكوادور',540,'dark',8,'🍫','https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=600&q=85&fit=crop',false,true,false),
('Grand Gift Set','طقم الهدايا الفاخر','تجربة الشوكولاتة المطلقة',600,'gifts',15,'🎁','https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=600&q=85&fit=crop',false,false,true),
('Milk Praline Bar','لوح شوكولاتة الحليب بالبرالين','حليب مخملي مع قطع البندق المحمص',280,'milk',32,'🍫','https://images.unsplash.com/photo-1511381939415-e44015466834?w=600&q=85&fit=crop',false,false,false),
('White Rose Bites','قطع الشوكولاتة البيضاء بالورد','شوكولاتة بيضاء كريمية بلمسة ماء الورد',260,'white',5,'🤍','https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=600&q=85&fit=crop',false,true,false),
('Salted Caramel Bites','قطع الكراميل المملح المغطاة بالشوكولاتة','كراميل ذائب بلمسة ملح البحر',230,'caramel',18,'🍬','https://images.unsplash.com/photo-1575377222312-dd1a63a51638?w=600&q=85&fit=crop',false,false,false)
on conflict do nothing;
