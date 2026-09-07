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
  notes TEXT,
  ready_notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- 8. Índices para acelerar búsquedas
CREATE INDEX IF NOT EXISTS idx_orders_public_token ON public.orders(public_token);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

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

-- ==========================================================
-- SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- ==========================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE PERMISOS
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
