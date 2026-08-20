-- ==========================================================
-- MR CLEAN SNEAKERS — DATOS DE PRUEBA GENÉRICOS (SEED DATA)
-- ==========================================================

-- Limpiar datos de prueba previos si existen
TRUNCATE TABLE public.order_items, public.orders CASCADE;
ALTER SEQUENCE order_number_seq RESTART WITH 1;

-- 1. Insertar Pedido #1 (En Proceso)
WITH new_order1 AS (
  INSERT INTO public.orders (
    customer_name,
    customer_phone,
    reception_date,
    estimated_delivery_date,
    status,
    payment_method,
    payment_status,
    total_amount,
    notes,
    public_token
  ) VALUES (
    'Carlos Mendoza',
    '525512345678',
    NOW() - INTERVAL '2 days',
    (CURRENT_DATE + INTERVAL '1 day')::date,
    'in_progress',
    'transfer',
    'paid',
    350.00,
    'Tratamiento especial para gamuza negra. Cuidado extremo con el logo.',
    'MC-a8F3kP92xL'
  ) RETURNING id
)
INSERT INTO public.order_items (order_id, brand_model, service_name, price, before_photos, after_photos)
SELECT id, 'Nike Air Force 1 Low White', 'Limpieza Profunda + Blanqueamiento de Suela', 200.00, 
  ARRAY['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80'], 
  ARRAY[]::text[] FROM new_order1
UNION ALL
SELECT id, 'Adidas Yeezy Boost 350 V2', 'Limpieza de Primeknit + Desodorización UV', 150.00, 
  ARRAY['https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80'], 
  ARRAY[]::text[] FROM new_order1;


-- 2. Insertar Pedido #2 (Listo para Entrega)
WITH new_order2 AS (
  INSERT INTO public.orders (
    customer_name,
    customer_phone,
    reception_date,
    estimated_delivery_date,
    status,
    payment_method,
    payment_status,
    total_amount,
    notes,
    ready_notification_sent,
    public_token
  ) VALUES (
    'Mariana Ríos',
    '525598765432',
    NOW() - INTERVAL '4 days',
    (CURRENT_DATE - INTERVAL '1 day')::date,
    'ready',
    'cash',
    'pending',
    180.00,
    'Entregar en bolsa antipolvo.',
    true,
    'MC-7k9P2xL8aF'
  ) RETURNING id
)
INSERT INTO public.order_items (order_id, brand_model, service_name, price, before_photos, after_photos)
SELECT id, 'Jordan 1 Retro High OG Chicago', 'Restauración de Piel + Repintado de Entresuela', 180.00, 
  ARRAY['https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&auto=format&fit=crop&q=80'], 
  ARRAY['https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=600&auto=format&fit=crop&q=80'] FROM new_order2;


-- 3. Insertar Pedido #3 (Recibido)
WITH new_order3 AS (
  INSERT INTO public.orders (
    customer_name,
    customer_phone,
    reception_date,
    estimated_delivery_date,
    status,
    payment_method,
    payment_status,
    total_amount,
    notes,
    public_token
  ) VALUES (
    'Roberto Gómez',
    '525544332211',
    NOW() - INTERVAL '3 hours',
    (CURRENT_DATE + INTERVAL '2 days')::date,
    'received',
    'card',
    'paid',
    150.00,
    'Cliente pide revisar costuras del talón.',
    'MC-3b8X9mL1pQ'
  ) RETURNING id
)
INSERT INTO public.order_items (order_id, brand_model, service_name, price, before_photos, after_photos)
SELECT id, 'New Balance 550 White Green', 'Limpieza Exprés', 150.00, 
  ARRAY['https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&auto=format&fit=crop&q=80'], 
  ARRAY[]::text[] FROM new_order3;


-- 4. Insertar Pedido #4 (Entregado)
WITH new_order4 AS (
  INSERT INTO public.orders (
    customer_name,
    customer_phone,
    reception_date,
    estimated_delivery_date,
    status,
    payment_method,
    payment_status,
    total_amount,
    notes,
    delivered_notification_sent,
    public_token
  ) VALUES (
    'Sofía Torres',
    '525566778899',
    NOW() - INTERVAL '6 days',
    NOW() - INTERVAL '1 day',
    'delivered',
    'transfer',
    'paid',
    250.00,
    'Entregado conforme en sucursal.',
    true,
    'MC-9k2W4xR7vT'
  ) RETURNING id
)
INSERT INTO public.order_items (order_id, brand_model, service_name, price, before_photos, after_photos)
SELECT id, 'Alexander McQueen Oversized Leather', 'Limpieza Premium + Gamuza', 250.00, 
  ARRAY['https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&auto=format&fit=crop&q=80'], 
  ARRAY['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80'] FROM new_order4;
