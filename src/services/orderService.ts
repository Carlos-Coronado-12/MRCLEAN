import { supabase, isDemoMode } from '../lib/supabaseClient';
import { Order, OrderItem, OrderStatus, BusinessSettings, Customer, Product } from '../types/database';

const LOCAL_STORAGE_ORDERS_KEY = 'mrclean_orders_db_v1';
const LOCAL_STORAGE_SETTINGS_KEY = 'mrclean_settings_db_v1';
const LOCAL_STORAGE_CUSTOMERS_KEY = 'mrclean_customers_db_v1';
const LOCAL_STORAGE_PRODUCTS_KEY = 'mrclean_products_db_v1';

// Datos iniciales de demostración en caso de no tener Supabase configurado aún
const INITIAL_DEMO_ORDERS: Order[] = [
  {
    id: 'demo-order-1',
    order_number: 'MC-000001',
    public_token: 'MC-a8F3kP92xL',
    customer_name: 'Carlos Mendoza',
    customer_phone: '525512345678',
    reception_date: new Date(Date.now() - 86400000 * 2).toISOString(),
    estimated_delivery_date: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
    status: 'in_progress',
    payment_method: 'transfer',
    payment_status: 'paid',
    total_amount: 400.00,
    paid_amount: 400.00,
    notes: 'Tratamiento especial para gamuza negra. Cuidado extremo con el logo.',
    ready_notification_sent: false,
    delivered_notification_sent: false,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    order_items: [
      {
        id: 'item-1',
        brand_model: 'Nike Air Force 1 Low White',
        service_name: 'Limpieza Detallada + Blanqueamiento de suela',
        price: 250.00,
        before_photos: [
          'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80'
        ],
        after_photos: []
      },
      {
        id: 'item-2',
        brand_model: 'Adidas Yeezy Boost 350 V2',
        service_name: 'Limpieza Sencilla',
        price: 150.00,
        before_photos: [
          'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80'
        ],
        after_photos: []
      }
    ]
  },
  {
    id: 'demo-order-2',
    order_number: 'MC-000002',
    public_token: 'MC-7k9P2xL8aF',
    customer_name: 'Mariana Ríos',
    customer_phone: '525598765432',
    reception_date: new Date(Date.now() - 86400000 * 4).toISOString(),
    estimated_delivery_date: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
    status: 'ready',
    payment_method: 'cash',
    payment_status: 'partial',
    total_amount: 150.00,
    paid_amount: 50.00,
    notes: 'Entregar en bolsa antipolvo.',
    ready_notification_sent: true,
    delivered_notification_sent: false,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    order_items: [
      {
        id: 'item-3',
        brand_model: 'Gorra New Era NY 59FIFTY',
        service_name: 'Gorra',
        price: 150.00,
        before_photos: [
          'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&auto=format&fit=crop&q=80'
        ],
        after_photos: [
          'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=600&auto=format&fit=crop&q=80'
        ]
      }
    ]
  }
];

function generateRandomToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'MC-';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getLocalOrders(): Order[] {
  const data = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(INITIAL_DEMO_ORDERS));
    return INITIAL_DEMO_ORDERS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_DEMO_ORDERS;
  }
}

function saveLocalOrders(orders: Order[]) {
  localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders));
}

export async function fetchOrders(): Promise<Order[]> {
  if (isDemoMode) {
    return getLocalOrders();
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Order[];
  } catch (err) {
    console.warn('Error al conectar con Supabase, usando respaldo local:', err);
    return getLocalOrders();
  }
}

export async function fetchOrderByToken(token: string): Promise<Order | null> {
  if (isDemoMode) {
    const orders = getLocalOrders();
    return orders.find(o => o.public_token === token || o.order_number === token) || null;
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('public_token', token)
      .single();

    if (error || !data) {
      // Intentar por order_number
      const { data: dataNum } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('order_number', token)
        .single();
      return dataNum as Order || null;
    }
    return data as Order;
  } catch (err) {
    console.warn('Error obteniendo orden por token en Supabase:', err);
    const orders = getLocalOrders();
    return orders.find(o => o.public_token === token || o.order_number === token) || null;
  }
}

export async function saveOrder(
  orderData: Partial<Order>,
  itemsData: Partial<OrderItem>[]
): Promise<Order> {
  const isEditing = Boolean(orderData.id);

  if (isDemoMode) {
    const orders = getLocalOrders();
    let updatedOrder: Order;

    if (isEditing) {
      const idx = orders.findIndex(o => o.id === orderData.id);
      const existing = orders[idx] || {};
      updatedOrder = {
        ...existing,
        ...orderData,
        updated_at: new Date().toISOString(),
        order_items: itemsData.map((it, i) => ({
          id: it.id || `item-local-${Date.now()}-${i}`,
          brand_model: it.brand_model || '',
          service_name: it.service_name || '',
          price: Number(it.price) || 0,
          before_photos: it.before_photos || [],
          after_photos: it.after_photos || []
        }))
      } as Order;
      if (idx !== -1) orders[idx] = updatedOrder;
    } else {
      const nextNum = orders.length + 1;
      const orderNum = `MC-${String(nextNum).padStart(6, '0')}`;
      const token = generateRandomToken();
      
      const total = itemsData.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
      const paid = orderData.payment_status === 'paid' 
        ? (orderData.paid_amount !== undefined && orderData.paid_amount > 0 ? orderData.paid_amount : total)
        : orderData.payment_status === 'partial' 
        ? (Number(orderData.paid_amount) || 0) 
        : 0;

      updatedOrder = {
        id: `local-ord-${Date.now()}`,
        order_number: orderNum,
        public_token: token,
        customer_name: orderData.customer_name || 'Cliente Sin Nombre',
        customer_phone: orderData.customer_phone || '',
        reception_date: orderData.reception_date || new Date().toISOString(),
        estimated_delivery_date: orderData.estimated_delivery_date || null,
        status: orderData.status || 'received',
        payment_method: orderData.payment_method || 'pending',
        payment_status: orderData.payment_status || 'pending',
        total_amount: total,
        paid_amount: paid,
        notes: orderData.notes || '',
        ready_notification_sent: false,
        delivered_notification_sent: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        order_items: itemsData.map((it, i) => ({
          id: `item-local-${Date.now()}-${i}`,
          brand_model: it.brand_model || '',
          service_name: it.service_name || '',
          price: Number(it.price) || 0,
          before_photos: it.before_photos || [],
          after_photos: it.after_photos || []
        }))
      };
      orders.unshift(updatedOrder);
    }

    if (orderData.customer_name && orderData.customer_phone) {
      saveCustomer({
        name: orderData.customer_name,
        phone: orderData.customer_phone
      }).catch(err => console.warn('Auto-save customer warning:', err));
    }

    saveLocalOrders(orders);
    return updatedOrder;
  }

  // Supabase real implementation
  try {
    const total = itemsData.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const paid = orderData.payment_status === 'paid' 
      ? (orderData.paid_amount !== undefined && orderData.paid_amount > 0 ? orderData.paid_amount : total)
      : orderData.payment_status === 'partial' 
      ? (Number(orderData.paid_amount) || 0) 
      : 0;

    let savedOrder: Order;
    if (isEditing) {
      const { data, error } = await supabase
        .from('orders')
        .update({
          customer_name: orderData.customer_name,
          customer_phone: orderData.customer_phone,
          estimated_delivery_date: orderData.estimated_delivery_date,
          status: orderData.status,
          payment_method: orderData.payment_method,
          payment_status: orderData.payment_status,
          total_amount: total,
          paid_amount: paid,
          notes: orderData.notes
        })
        .eq('id', orderData.id)
        .select()
        .single();

      if (error) throw error;
      savedOrder = data;

      // Actualizar ítems
      await supabase.from('order_items').delete().eq('order_id', orderData.id);
      const itemsToInsert = itemsData.map(it => ({
        order_id: orderData.id,
        brand_model: it.brand_model,
        service_name: it.service_name,
        price: it.price,
        before_photos: it.before_photos || [],
        after_photos: it.after_photos || []
      }));
      await supabase.from('order_items').insert(itemsToInsert);

    } else {
      const token = generateRandomToken();
      const { data, error } = await supabase
        .from('orders')
        .insert([{
          public_token: token,
          customer_name: orderData.customer_name,
          customer_phone: orderData.customer_phone,
          reception_date: orderData.reception_date || new Date().toISOString(),
          estimated_delivery_date: orderData.estimated_delivery_date,
          status: orderData.status || 'received',
          payment_method: orderData.payment_method || 'pending',
          payment_status: orderData.payment_status || 'pending',
          total_amount: total,
          paid_amount: paid,
          notes: orderData.notes
        }])
        .select()
        .single();

      if (error) throw error;
      savedOrder = data;

      const itemsToInsert = itemsData.map(it => ({
        order_id: savedOrder.id,
        brand_model: it.brand_model,
        service_name: it.service_name,
        price: it.price,
        before_photos: it.before_photos || [],
        after_photos: it.after_photos || []
      }));
      await supabase.from('order_items').insert(itemsToInsert);
    }

    if (orderData.customer_name && orderData.customer_phone) {
      saveCustomer({
        name: orderData.customer_name,
        phone: orderData.customer_phone
      }).catch(err => console.warn('Auto-save customer warning:', err));
    }

    const fullOrder = await fetchOrderByToken(savedOrder.public_token);
    return fullOrder || savedOrder;

  } catch (err) {
    console.error('Error al guardar en Supabase:', err);
    throw err;
  }
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<{ order: Order; autoNotificationAttempted: boolean }> {
  if (isDemoMode) {
    const orders = getLocalOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    let autoSent = false;
    if (idx !== -1) {
      const current = orders[idx];
      current.status = newStatus;
      current.updated_at = new Date().toISOString();

      if (newStatus === 'ready' && !current.ready_notification_sent) {
        current.ready_notification_sent = true;
        autoSent = true;
      } else if (newStatus === 'delivered' && !current.delivered_notification_sent) {
        current.delivered_notification_sent = true;
        autoSent = true;
      }

      orders[idx] = current;
      saveLocalOrders(orders);
      return { order: current, autoNotificationAttempted: autoSent };
    }
  }

  try {
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    const { data: updated, error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select('*, order_items(*)')
      .single();

    if (error) throw error;

    let autoSent = false;
    // Intentar disparar Edge Function de WhatsApp si cambia a 'ready' o 'delivered'
    if (
      (newStatus === 'ready' && !currentOrder?.ready_notification_sent) ||
      (newStatus === 'delivered' && !currentOrder?.delivered_notification_sent)
    ) {
      autoSent = true;
      try {
        await supabase.functions.invoke('whatsapp-notify', {
          body: { order_id: orderId, event_type: newStatus === 'ready' ? 'ready' : 'delivered' }
        });
      } catch (e) {
        console.warn('Edge Function no conectada o en dev, usando aviso local:', e);
      }
    }

    return { order: updated as Order, autoNotificationAttempted: autoSent };
  } catch (err) {
    console.error('Error actualizando estado:', err);
    throw err;
  }
}

export async function fetchBusinessSettings(): Promise<BusinessSettings | null> {
  if (isDemoMode) {
    const data = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (data) {
      try { return JSON.parse(data); } catch {}
    }
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('business_settings')
      .select('*')
      .single();

    if (error) return null;
    return data as BusinessSettings;
  } catch {
    return null;
  }
}

export function generateWhatsAppLink(
  order: Order,
  eventType: 'new_order' | 'ready' | 'delivered' | 'custom' | 'contact_store',
  overridePhone?: string
): string {
  let targetPhone = overridePhone || '';
  if (!targetPhone) {
    if (eventType === 'contact_store') {
      targetPhone = '6147324931';
    } else {
      targetPhone = order.customer_phone || '';
    }
  }

  let cleanPhone = targetPhone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '52' + cleanPhone;
  }

  const baseUrl = window.location.origin;
  const publicUrl = `${baseUrl}/pedido/${order.public_token}`;

  const paid = order.payment_status === 'paid' ? order.total_amount : (order.paid_amount || 0);
  const remaining = Math.max(0, order.total_amount - paid);

  let paymentDetails = `*Total:* $${order.total_amount.toFixed(2)} MXN`;
  if (order.payment_status === 'partial') {
    paymentDetails = `*Total:* $${order.total_amount.toFixed(2)} MXN\n*Abono recibido:* $${paid.toFixed(2)} MXN\n*Saldo pendiente:* $${remaining.toFixed(2)} MXN`;
  } else if (order.payment_status === 'paid') {
    paymentDetails = `*Total:* $${order.total_amount.toFixed(2)} MXN (Pagado completo)`;
  }

  let text = '';
  if (eventType === 'new_order') {
    text = `*MR CLEAN SNEAKERS*\n\n¡Hola *${order.customer_name}*!\n\nYa recibimos tu pedido.\n\n*Orden:* #${order.order_number}\n${paymentDetails}\n\nPuedes consultar el avance y fotos de tu pedido en tiempo real en el siguiente enlace:\n${publicUrl}\n\n¡Gracias por tu confianza!`;
  } else if (eventType === 'ready') {
    const balanceNotice = order.payment_status === 'partial' 
      ? `\n*Saldo pendiente por liquidar:* $${remaining.toFixed(2)} MXN`
      : order.payment_status === 'pending'
      ? `\n*Total a liquidar:* $${order.total_amount.toFixed(2)} MXN`
      : '';
    text = `*MR CLEAN SNEAKERS*\n\n¡Hola *${order.customer_name}*!\n\nTus tenis han quedado listos y están preparados para entrega.\n\n*Orden:* #${order.order_number}\n*Estado:* LISTO PARA ENTREGA${balanceNotice}\n\nConsulta los detalles y fotos finales aquí:\n${publicUrl}\n\n¡Te esperamos en tienda!`;
  } else if (eventType === 'delivered') {
    text = `*MR CLEAN SNEAKERS*\n\n¡Gracias por tu preferencia, *${order.customer_name}*!\n\nTu orden *#${order.order_number}* ha sido entregada con éxito. Esperamos que disfrutes tus tenis impecables.\n\n¡Esperamos verte pronto de nuevo!`;
  } else if (eventType === 'contact_store') {
    text = `*MR CLEAN SNEAKERS*\n\n¡Hola! Me gustaría hacer otro pedido.`;
  } else {
    text = `*MR CLEAN SNEAKERS*\n\n¡Hola *${order.customer_name}*! Te compartimos el enlace oficial para consultar el avance de tu pedido en tiempo real:\n\n*Orden:* #${order.order_number}\n${paymentDetails}\n${publicUrl}`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export async function uploadOrderPhoto(file: File): Promise<string> {
  if (isDemoMode) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `photos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('orders-photos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('orders-photos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error('Error subiendo imagen a Supabase Storage:', err);
    // Fallback a base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }
}

// ==========================================================
// GESTIÓN DE CLIENTES FRECUENTES
// ==========================================================

const INITIAL_DEMO_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Carlos Mendoza',
    phone: '525512345678',
    notes: 'Cliente frecuente. Atención prioritaria.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'cust-2',
    name: 'Mariana Ríos',
    phone: '525598765432',
    notes: 'Prefiere bolsa antipolvo.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

function getLocalCustomers(): Customer[] {
  const data = localStorage.getItem(LOCAL_STORAGE_CUSTOMERS_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(INITIAL_DEMO_CUSTOMERS));
    return INITIAL_DEMO_CUSTOMERS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_DEMO_CUSTOMERS;
  }
}

function saveLocalCustomers(custs: Customer[]) {
  localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(custs));
}

export async function fetchCustomers(): Promise<Customer[]> {
  if (isDemoMode) {
    return getLocalCustomers();
  }

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data as Customer[];
  } catch (err) {
    console.warn('Error al conectar con Supabase para clientes, usando respaldo local:', err);
    return getLocalCustomers();
  }
}

export async function saveCustomer(custData: Partial<Customer>): Promise<Customer> {
  if (!custData.name?.trim() || !custData.phone?.trim()) {
    throw new Error('Nombre y teléfono son obligatorios para guardar el cliente');
  }

  const isEditing = Boolean(custData.id);

  if (isDemoMode) {
    const custs = getLocalCustomers();
    let updated: Customer;
    if (isEditing) {
      const idx = custs.findIndex(c => c.id === custData.id);
      updated = {
        ...(custs[idx] || {}),
        ...custData,
        updated_at: new Date().toISOString()
      } as Customer;
      if (idx !== -1) custs[idx] = updated;
    } else {
      updated = {
        id: `cust-local-${Date.now()}`,
        name: custData.name.trim(),
        phone: custData.phone.trim(),
        notes: custData.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const existingIdx = custs.findIndex(c => c.phone === updated.phone);
      if (existingIdx !== -1) {
        custs[existingIdx] = { ...custs[existingIdx], ...updated };
      } else {
        custs.unshift(updated);
      }
    }
    saveLocalCustomers(custs);
    return updated;
  }

  try {
    let saved: Customer;
    if (isEditing) {
      const { data, error } = await supabase
        .from('customers')
        .update({
          name: custData.name.trim(),
          phone: custData.phone.trim(),
          notes: custData.notes
        })
        .eq('id', custData.id)
        .select()
        .single();
      if (error) throw error;
      saved = data;
    } else {
      const { data, error } = await supabase
        .from('customers')
        .upsert(
          {
            name: custData.name.trim(),
            phone: custData.phone.trim(),
            notes: custData.notes
          },
          { onConflict: 'phone' }
        )
        .select()
        .single();
      if (error) throw error;
      saved = data;
    }
    return saved;
  } catch (err) {
    console.error('Error guardando cliente en Supabase:', err);
    throw err;
  }
}

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function deleteCustomer(identifier: string): Promise<void> {
  // Eliminar localmente siempre por respaldo
  const custs = getLocalCustomers();
  const filtered = custs.filter(c => c.id !== identifier && c.phone !== identifier);
  saveLocalCustomers(filtered);

  if (isDemoMode) {
    return;
  }

  try {
    if (isUUID(identifier)) {
      const { error } = await supabase.from('customers').delete().eq('id', identifier);
      if (error) console.warn('Aviso borrando por ID en Supabase:', error.message);
    } else {
      const { error } = await supabase.from('customers').delete().eq('phone', identifier);
      if (error) console.warn('Aviso borrando por Teléfono en Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Advertencia eliminando cliente en Supabase:', err);
  }
}

export async function deleteOrder(id: string): Promise<void> {
  if (isDemoMode) {
    const orders = getLocalOrders();
    const filtered = orders.filter(o => o.id !== id);
    saveLocalOrders(filtered);
    return;
  }

  try {
    await supabase.from('order_items').delete().eq('order_id', id);
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('Error eliminando pedido en Supabase:', err);
    throw err;
  }
}

// ==========================================================
// GESTIÓN DE PRODUCTOS Y SERVICIOS
// ==========================================================

export const INITIAL_DEMO_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Limpieza Sencilla',
    price: 150.00,
    category: 'servicio',
    description: 'Lavado general exterior, agujetas y media suela básica.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'prod-2',
    name: 'Limpieza Detallada',
    price: 200.00,
    category: 'servicio',
    description: 'Lavado profundo interior/exterior, desinfección y acondicionado de materiales.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'prod-3',
    name: 'Gorra',
    price: 150.00,
    category: 'servicio',
    description: 'Limpieza especializada de gorras con hormado y eliminación de sudor.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'prod-4',
    name: 'Blanqueamiento de Suela',
    price: 50.00,
    category: 'complemento',
    description: 'Tratamiento desamarilleador de suelas de goma/transparentes.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'prod-5',
    name: 'Restauración / Pintura',
    price: 350.00,
    category: 'restauracion',
    description: 'Repintado de media suela o piel dañada con pintura acrílica especializada.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

function getLocalProducts(): Product[] {
  const data = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(INITIAL_DEMO_PRODUCTS));
    return INITIAL_DEMO_PRODUCTS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_DEMO_PRODUCTS;
  }
}

function saveLocalProducts(products: Product[]) {
  localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(products));
}

export async function fetchProducts(): Promise<Product[]> {
  if (isDemoMode) {
    return getLocalProducts();
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    // Si no hay productos en la BD aún, retornar iniciales como fallback
    if (!data || data.length === 0) {
      return getLocalProducts();
    }
    return data as Product[];
  } catch (err) {
    console.warn('Error al obtener productos de Supabase, usando respaldo local:', err);
    return getLocalProducts();
  }
}

export async function saveProduct(productData: Partial<Product>): Promise<Product> {
  if (!productData.name?.trim()) {
    throw new Error('El nombre del producto/servicio es obligatorio');
  }
  if (productData.price === undefined || productData.price < 0) {
    throw new Error('El precio debe ser un número mayor o igual a 0');
  }

  const isEditing = Boolean(productData.id);

  if (isDemoMode) {
    const products = getLocalProducts();
    let updated: Product;
    if (isEditing) {
      const idx = products.findIndex(p => p.id === productData.id);
      updated = {
        ...(products[idx] || {}),
        ...productData,
        price: Number(productData.price),
        updated_at: new Date().toISOString()
      } as Product;
      if (idx !== -1) products[idx] = updated;
    } else {
      updated = {
        id: `prod-local-${Date.now()}`,
        name: productData.name.trim(),
        price: Number(productData.price),
        category: productData.category || 'servicio',
        description: productData.description || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      products.push(updated);
    }
    saveLocalProducts(products);
    return updated;
  }

  try {
    let saved: Product;
    if (isEditing) {
      const { data, error } = await supabase
        .from('products')
        .update({
          name: productData.name.trim(),
          price: Number(productData.price),
          category: productData.category || 'servicio',
          description: productData.description || null
        })
        .eq('id', productData.id)
        .select()
        .single();
      if (error) throw error;
      saved = data;
    } else {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: productData.name.trim(),
          price: Number(productData.price),
          category: productData.category || 'servicio',
          description: productData.description || null
        }])
        .select()
        .single();
      if (error) throw error;
      saved = data;
    }
    return saved;
  } catch (err) {
    console.warn('Error guardando producto en Supabase (usando respaldo local):', err);
    // Respaldo local si la tabla aún no se ha creado en el SQL Editor de Supabase
    const products = getLocalProducts();
    let updated: Product;
    if (isEditing) {
      const idx = products.findIndex(p => p.id === productData.id);
      updated = {
        ...(products[idx] || {}),
        ...productData,
        price: Number(productData.price),
        updated_at: new Date().toISOString()
      } as Product;
      if (idx !== -1) products[idx] = updated;
    } else {
      updated = {
        id: `prod-local-${Date.now()}`,
        name: productData.name.trim(),
        price: Number(productData.price),
        category: productData.category || 'servicio',
        description: productData.description || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      products.push(updated);
    }
    saveLocalProducts(products);
    return updated;
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const products = getLocalProducts();
  const filtered = products.filter(p => p.id !== id);
  saveLocalProducts(filtered);

  if (isDemoMode) return;

  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) console.warn('Aviso borrando producto en Supabase:', error.message);
  } catch (err) {
    console.warn('Error eliminando producto en Supabase:', err);
  }
}


