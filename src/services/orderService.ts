import { supabase, isDemoMode } from '../lib/supabaseClient';
import { Order, OrderItem, OrderStatus, BusinessSettings } from '../types/database';

const LOCAL_STORAGE_ORDERS_KEY = 'mrclean_orders_db_v1';
const LOCAL_STORAGE_SETTINGS_KEY = 'mrclean_settings_db_v1';

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
    total_amount: 350.00,
    notes: 'Tratamiento especial para gamuza negra. Cuidado extremo con el logo.',
    ready_notification_sent: false,
    delivered_notification_sent: false,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    order_items: [
      {
        id: 'item-1',
        brand_model: 'Nike Air Force 1 Low White',
        service_name: 'Limpieza Profunda + Blanqueamiento de Suela',
        price: 200.00,
        before_photos: [
          'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80'
        ],
        after_photos: []
      },
      {
        id: 'item-2',
        brand_model: 'Adidas Yeezy Boost 350 V2',
        service_name: 'Limpieza de Primeknit + Desodorización UV',
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
    payment_status: 'pending',
    total_amount: 180.00,
    notes: 'Entregar en bolsa antipolvo.',
    ready_notification_sent: true,
    delivered_notification_sent: false,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    order_items: [
      {
        id: 'item-3',
        brand_model: 'Jordan 1 Retro High OG Chicago',
        service_name: 'Restauración de Piel + Repintado de Entresuela',
        price: 180.00,
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
    saveLocalOrders(orders);
    return updatedOrder;
  }

  // Supabase real implementation
  try {
    const total = itemsData.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

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

export function generateWhatsAppLink(order: Order, eventType: 'new_order' | 'ready' | 'delivered' | 'custom'): string {
  let cleanPhone = (order.customer_phone || '').replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '52' + cleanPhone;
  }

  const baseUrl = window.location.origin;
  const publicUrl = `${baseUrl}/pedido/${order.public_token}`;

  let text = '';
  if (eventType === 'new_order') {
    text = `🧼 *MR CLEAN SNEAKERS*\n\nHola *${order.customer_name}* 👋\n\nHemos recibido tus tenis correctamente.\n\n📌 *Orden:* #${order.order_number}\n💰 *Total:* $${order.total_amount.toFixed(2)}\n\nPuedes consultar el avance de tu pedido en tiempo real aquí:\n🔗 ${publicUrl}`;
  } else if (eventType === 'ready') {
    text = `🧼 *MR CLEAN SNEAKERS*\n\n¡Hola *${order.customer_name}*! 👋\n\n¡Tus tenis ya están listos! 🔥👟\n\n📌 *Orden:* #${order.order_number}\n✅ *Estado:* LISTO PARA ENTREGA\n\nConsulta los detalles y fotos finales aquí:\n🔗 ${publicUrl}`;
  } else if (eventType === 'delivered') {
    text = `🧼 *MR CLEAN SNEAKERS*\n\n¡Gracias por confiar en nosotros! 🤝\n\nTu orden *#${order.order_number}* ha sido entregada correctamente. Esperamos verte nuevamente pronto. 👟✨`;
  } else {
    text = `🧼 *MR CLEAN SNEAKERS*\n\nHola *${order.customer_name}*, te compartimos el enlace para consultar tu pedido #${order.order_number}:\n🔗 ${publicUrl}`;
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
