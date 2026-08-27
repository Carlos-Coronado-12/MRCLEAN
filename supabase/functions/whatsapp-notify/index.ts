// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyPayload {
  order_id: string;
  event_type: 'new_order' | 'ready' | 'delivered';
  custom_phone?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: NotifyPayload = await req.json();
    const { order_id, event_type } = body;

    if (!order_id || !event_type) {
      return new Response(
        JSON.stringify({ error: 'order_id y event_type son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Obtener la orden de la base de datos
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Orden no encontrada: ' + (orderError?.message || '') }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Idempotencia: Verificar si ya se envió la notificación
    if (event_type === 'ready' && order.ready_notification_sent) {
      return new Response(
        JSON.stringify({ success: true, message: 'La notificación de Pedido Listo ya fue enviada previamente.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (event_type === 'delivered' && order.delivered_notification_sent) {
      return new Response(
        JSON.stringify({ success: true, message: 'La notificación de Pedido Entregado ya fue enviada previamente.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Obtener credenciales de WhatsApp de business_settings o variables de entorno
    const { data: settings } = await supabase
      .from('business_settings')
      .select('*')
      .single();

    const phoneNumberId = settings?.whatsapp_phone_number_id || Deno.env.get('META_WHATSAPP_PHONE_NUMBER_ID');
    const accessToken = settings?.whatsapp_access_token || Deno.env.get('META_WHATSAPP_ACCESS_TOKEN');

    // Sanitizar número de teléfono (debe incluir código de país sin símbolos +, ej: 52155...)
    let cleanPhone = (order.customer_phone || '').replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '52' + cleanPhone; // Por defecto prefijo México si es 10 dígitos
    }

    const publicUrl = `${Deno.env.get('PUBLIC_WEB_APP_URL') || 'https://mrclean.vercel.app'}/pedido/${order.public_token}`;

    // Construir mensaje o template payload según el evento
    let templateName = '';
    let parameters: any[] = [];
    let fallbackText = '';

    if (event_type === 'new_order') {
      templateName = 'mr_clean_nuevo_pedido';
      fallbackText = `*MR CLEAN SNEAKERS*\n\n¡Hola *${order.customer_name}*!\n\nYa recibimos tu pedido.\n\n*Orden:* #${order.order_number}\n*Total:* $${order.total_amount} MXN\n\nPuedes consultar el avance y fotos de tu pedido en tiempo real en el siguiente enlace:\n${publicUrl}\n\n¡Gracias por tu confianza!`;
      parameters = [
        { type: "text", text: order.customer_name },
        { type: "text", text: order.order_number },
        { type: "text", text: `$${order.total_amount}` },
        { type: "text", text: publicUrl }
      ];
    } else if (event_type === 'ready') {
      templateName = 'mr_clean_pedido_listo';
      fallbackText = `*MR CLEAN SNEAKERS*\n\n¡Hola *${order.customer_name}*!\n\nTus tenis han quedado listos y están preparados para entrega.\n\n*Orden:* #${order.order_number}\n*Estado:* LISTO PARA ENTREGA\n\nConsulta los detalles y fotos finales aquí:\n${publicUrl}\n\n¡Te esperamos en tienda!`;
      parameters = [
        { type: "text", text: order.customer_name },
        { type: "text", text: order.order_number },
        { type: "text", text: publicUrl }
      ];
    } else if (event_type === 'delivered') {
      templateName = 'mr_clean_pedido_entregado';
      fallbackText = `*MR CLEAN SNEAKERS*\n\n¡Gracias por tu preferencia, *${order.customer_name}*!\n\nTu orden *#${order.order_number}* ha sido entregada con éxito. Esperamos que disfrutes tus tenis impecables.\n\n¡Esperamos verte pronto de nuevo!`;
      parameters = [
        { type: "text", text: order.order_number }
      ];
    }

    let metaResult = null;
    let metaSuccess = false;

    if (phoneNumberId && accessToken) {
      // Intento 1: Enviar plantilla oficial de Meta
      const metaUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
      
      const payload = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "es" },
          components: [
            {
              type: "body",
              parameters: parameters
            }
          ]
        }
      };

      const metaRes = await fetch(metaUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      metaResult = await metaRes.json();
      metaSuccess = metaRes.ok;
    }

    // 3. Marcar flags de envío en la BD si tuvo éxito o si estamos en modo dev
    if (event_type === 'ready') {
      await supabase.from('orders').update({ ready_notification_sent: true }).eq('id', order_id);
    } else if (event_type === 'delivered') {
      await supabase.from('orders').update({ delivered_notification_sent: true }).eq('id', order_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        meta_success: metaSuccess,
        meta_response: metaResult,
        fallback_text: fallbackText,
        clean_phone: cleanPhone,
        whatsapp_url: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fallbackText)}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
