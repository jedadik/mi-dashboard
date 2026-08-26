import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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

serve(async (req) => {
  try {
    const body = await req.json()
    const { event, data } = body

    if (event === 'transaction.updated') {
      const signature = data?.signature
      const transaction = data?.transaction
      const secret = Deno.env.get('WOMPI_EVENTS_SECRET')

      if (!signature?.checksum || !Array.isArray(signature.properties) || !signature.timestamp || !secret) {
        return new Response(JSON.stringify({ error: 'Firma de evento inválida' }), { status: 401 })
      }

      const propertiesValue = signature.properties
        .map((property: string) => transaction?.[property])
        .join('')
      const signedPayload = `${propertiesValue}${signature.timestamp}${secret}`
      const expectedChecksum = await sha256Hex(signedPayload)

      if (!timingSafeEqual(expectedChecksum, signature.checksum.toLowerCase())) {
        return new Response(JSON.stringify({ error: 'Firma de evento inválida' }), { status: 401 })
      }
    }

    // Procesar únicamente transacciones aprobadas con firma válida
    if (event === 'transaction.updated' && data?.transaction?.status === 'APPROVED') {
      const customerEmail = data.transaction.customer_email
      const amountInCents = data.transaction.amount_in_cents

      // 2. Determinar días a sumar según el monto pagado (180.000 COP = 18000000 centavos)
      const isAnnual = amountInCents >= 18000000
      const daysToAdd = isAnnual ? 365 : 30
      const planType = isAnnual ? 'annual' : 'monthly'

      // Calcular nueva fecha final
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + daysToAdd)

      // 3. Conectar a Supabase con permisos de administrador
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // 4. Actualizar la suscripción en la tabla profiles
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: 'active',
          plan_type: planType,
          subscription_end_date: endDate.toISOString()
        })
        .eq('email', customerEmail)

      if (error) {
        console.error('Error actualizando perfil:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      }

      console.log(`Suscripción actualizada para ${customerEmail}: ${planType} (+${daysToAdd} días)`)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (err) {
    console.error('Error en el Webhook:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})