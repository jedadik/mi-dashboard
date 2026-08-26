import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const MONTHLY_AMOUNT_IN_CENTS = 2000000
const ANNUAL_AMOUNT_IN_CENTS = 18000000

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqual(first: string, second: string) {
  if (first.length !== second.length) return false
  let difference = 0
  for (let index = 0; index < first.length; index += 1) {
    difference |= first.charCodeAt(index) ^ second.charCodeAt(index)
  }
  return difference === 0
}

function getNestedValue(source: Record<string, unknown>, path: string) {
  return path.split('.').reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') return undefined
    return (value as Record<string, unknown>)[key]
  }, source)
}

serve(async (req) => {
  try {
    const body = await req.json()
    const { event, data } = body

    if (event === 'transaction.updated') {
      const signature = body.signature
      const transaction = data?.transaction
      const secret = Deno.env.get('WOMPI_EVENTS_SECRET')

      if (!signature?.checksum || !Array.isArray(signature.properties) || !body.timestamp || !secret) {
        return new Response(JSON.stringify({ error: 'Firma de evento inválida' }), { status: 401 })
      }

      const propertiesValue = signature.properties
        .map((property: string) => String(getNestedValue(body, property) ?? ''))
        .join('')
      const signedPayload = `${propertiesValue}${body.timestamp}${secret}`
      const expectedChecksum = await sha256Hex(signedPayload)

      if (!timingSafeEqual(expectedChecksum, signature.checksum.toLowerCase())) {
        return jsonResponse({ error: 'Firma de evento inválida' }, 401)
      }

      if (!transaction || transaction.status !== 'APPROVED') {
        return jsonResponse({ received: true })
      }

      const customerEmail = transaction.customer_email
      const amountInCents = transaction.amount_in_cents
      const currency = transaction.currency
      const paymentLinkId = transaction.payment_link_id
      const transactionId = transaction.id
      const monthlyLinkId = Deno.env.get('WOMPI_MONTHLY_LINK_ID')
      const annualLinkId = Deno.env.get('WOMPI_ANNUAL_LINK_ID')

      if (
        !transactionId ||
        !customerEmail ||
        currency !== 'COP' ||
        typeof amountInCents !== 'number' ||
        typeof paymentLinkId !== 'string' ||
        !monthlyLinkId ||
        !annualLinkId
      ) {
        return jsonResponse({ error: 'Datos de pago inválidos' }, 400)
      }

      const planType =
        amountInCents === MONTHLY_AMOUNT_IN_CENTS && paymentLinkId === monthlyLinkId
          ? 'monthly'
          : amountInCents === ANNUAL_AMOUNT_IN_CENTS && paymentLinkId === annualLinkId
            ? 'annual'
            : null

      if (!planType) {
        return jsonResponse({ error: 'Referencia o monto de pago inválido' }, 400)
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (!supabaseUrl || !serviceRoleKey) {
        return jsonResponse({ error: 'Configuración del servidor incompleta' }, 500)
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
      const { error: eventError } = await supabaseAdmin
        .from('payment_events')
        .insert({ transaction_id: transactionId, event_name: event })

      if (eventError) {
        if (eventError.code === '23505') {
          return jsonResponse({ received: true, duplicate: true })
        }
        console.error('Error registrando evento de pago:', eventError)
        return jsonResponse({ error: eventError.message }, 500)
      }

      const daysToAdd = planType === 'annual' ? 365 : 30
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + daysToAdd)

      const { data: updatedProfiles, error } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: 'active',
          plan_type: planType,
          subscription_end_date: endDate.toISOString()
        })
        .eq('email', customerEmail)
        .select('id')

      if (error) {
        console.error('Error actualizando perfil:', error)
        await supabaseAdmin.from('payment_events').delete().eq('transaction_id', transactionId)
        return jsonResponse({ error: error.message }, 500)
      }

      if (!updatedProfiles || updatedProfiles.length !== 1) {
        console.error(`Se esperaban 1 perfil para ${customerEmail}, se encontraron ${updatedProfiles?.length ?? 0}`)
        await supabaseAdmin.from('payment_events').delete().eq('transaction_id', transactionId)
        return jsonResponse({ error: 'Perfil de usuario no encontrado o no único' }, 409)
      }

      console.log(`Suscripción actualizada para ${customerEmail}: ${planType} (+${daysToAdd} días)`)
    }

    return jsonResponse({ received: true })
  } catch (err) {
    console.error('Error en el Webhook:', err)
    return jsonResponse({ error: err instanceof Error ? err.message : 'Solicitud inválida' }, 400)
  }
})