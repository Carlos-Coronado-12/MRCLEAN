-- ==========================================================
-- MR CLEAN SNEAKERS — ESQUEMA COMPLETO DE BASE DE DATOS Y RLS
-- (Copia y pega todo este código en el SQL Editor de Supabase)
-- ==========================================================

-- 1. Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Secuencia para número de orden consecutivo
CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1 INCREMENT BY 1;

-- 3. Función auxiliar para generar token público aleatorio y seguro
CREATE OR REPLACE FUNCTION generate_public_token()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := 'MC-';
  i INTEGER;
BEGIN
  FOR i IN 1..10 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. Tabla de Pedidos (orders)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL DEFAULT ('MC-' || LPAD(nextval('order_number_seq')::text, 6, '0')),
  public_token TEXT UNIQUE NOT NULL DEFAULT generate_public_token(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  reception_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  estimated_delivery_date DATE,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'in_progress', 'ready', 'delivered', 'cancelled')),
  payment_method TEXT NOT NULL DEFAULT 'pending' CHECK (payment_method IN ('cash', 'transfer', 'card', 'pending')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial')),
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  ready_notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Si la tabla ya existe, agregar la columna paid_amount:
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00;

-- 5. Tabla de Ítems / Pares por Pedido (order_items)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  brand_model TEXT NOT NULL,
  service_name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  before_photos TEXT[] DEFAULT '{}',
  after_photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Tabla de Configuración de Negocio (business_settings)
CREATE TABLE IF NOT EXISTS public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_phone TEXT DEFAULT '6147324931',
  send_delivered_whatsapp BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asegurar columna store_phone si la tabla ya existía previamente
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS store_phone TEXT DEFAULT '6147324931';

-- Insertar fila inicial de configuración si no existe
INSERT INTO public.business_settings (send_delivered_whatsapp, store_phone)
SELECT TRUE, '6147324931'
WHERE NOT EXISTS (SELECT 1 FROM public.business_settings);

-- 7. Tabla de Clientes Frecuentes (customers)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Tabla de Productos y Servicios (products)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  category TEXT DEFAULT 'servicio',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Índices para acelerar búsquedas
CREATE INDEX IF NOT EXISTS idx_orders_public_token ON public.orders(public_token);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- 9. Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================================
-- SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- ==========================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE PERMISOS
DROP POLICY IF EXISTS "Public full control on products" ON public.products;
CREATE POLICY "Public full control on products"
  ON public.products FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public full control on customers" ON public.customers;
DROP POLICY IF EXISTS "Admins full control on customers" ON public.customers;
CREATE POLICY "Public full control on customers"
  ON public.customers FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public full control on orders" ON public.orders;
DROP POLICY IF EXISTS "Admins full control on orders" ON public.orders;
DROP POLICY IF EXISTS "Public read orders" ON public.orders;
CREATE POLICY "Public full control on orders"
  ON public.orders FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public full control on order_items" ON public.order_items;
DROP POLICY IF EXISTS "Admins full control on order_items" ON public.order_items;
DROP POLICY IF EXISTS "Public read order_items" ON public.order_items;
CREATE POLICY "Public full control on order_items"
  ON public.order_items FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public full control on business_settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins full control on business_settings" ON public.business_settings;
CREATE POLICY "Public full control on business_settings"
  ON public.business_settings FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ==========================================================
-- CONFIGURACIÓN DE STORAGE EN SUPABASE FOR FOTOS
-- ==========================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('orders-photos', 'orders-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access to Order Photos" ON storage.objects;
CREATE POLICY "Public Access to Order Photos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'orders-photos');

DROP POLICY IF EXISTS "Public Upload Order Photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Order Photos" ON storage.objects;
CREATE POLICY "Public Upload Order Photos"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'orders-photos');

DROP POLICY IF EXISTS "Public Update Order Photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Order Photos" ON storage.objects;
CREATE POLICY "Public Update Order Photos"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'orders-photos');

DROP POLICY IF EXISTS "Public Delete Order Photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Order Photos" ON storage.objects;
CREATE POLICY "Public Delete Order Photos"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'orders-photos');

-- ==========================================================
-- 10. TABLA DE SOLICITUDES DE COLECTA (pickup_requests)
-- Para agendar recolección desde Instagram / Web pública
-- ==========================================================

CREATE SEQUENCE IF NOT EXISTS pickup_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.pickup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT UNIQUE NOT NULL DEFAULT ('COL-' || LPAD(nextval('pickup_number_seq')::text, 5, '0')),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  neighborhood TEXT,
  references TEXT,
  preferred_date DATE NOT NULL,
  preferred_time_slot TEXT NOT NULL DEFAULT 'Mañana (9:00 AM - 1:00 PM)',
  item_count INTEGER NOT NULL DEFAULT 1,
  services TEXT[] DEFAULT '{}',
  shoes_details TEXT,
  notes TEXT,
  photos TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'collected', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pickup_customer_phone ON public.pickup_requests(customer_phone);
CREATE INDEX IF NOT EXISTS idx_pickup_status ON public.pickup_requests(status);
CREATE INDEX IF NOT EXISTS idx_pickup_preferred_date ON public.pickup_requests(preferred_date);

DROP TRIGGER IF EXISTS update_pickup_requests_updated_at ON public.pickup_requests;
CREATE TRIGGER update_pickup_requests_updated_at
  BEFORE UPDATE ON public.pickup_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.pickup_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full control on pickup_requests" ON public.pickup_requests;
CREATE POLICY "Public full control on pickup_requests"
  ON public.pickup_requests FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ==========================================================
-- 11. TABLA DE PROMOCIONES Y OFERTAS (promotions)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  promo_type TEXT NOT NULL DEFAULT 'bulk_pairs' CHECK (promo_type IN ('bulk_pairs', 'fixed_discount', 'percentage_discount', 'package_price')),
  min_pairs INTEGER DEFAULT 5,
  special_price_per_pair NUMERIC(10,2) DEFAULT 100.00,
  discount_value NUMERIC(10,2) DEFAULT 0.00,
  package_price NUMERIC(10,2) DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  highlight_badge TEXT DEFAULT 'PROMO DESTACADA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions(is_active);

DROP TRIGGER IF EXISTS update_promotions_updated_at ON public.promotions;
CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full control on promotions" ON public.promotions;
CREATE POLICY "Public full control on promotions"
  ON public.promotions FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Insertar promoción inicial de 5+ pares a $100 c/u
INSERT INTO public.promotions (title, description, promo_type, min_pairs, special_price_per_pair, is_active, highlight_badge)
SELECT 'Promo 5+ Pares a $100 c/u', 'A partir de 5 pares tu limpieza queda a solo $100 cada par', 'bulk_pairs', 5, 100.00, TRUE, 'SUPER PROMO'
WHERE NOT EXISTS (SELECT 1 FROM public.promotions);
