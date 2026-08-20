import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const body = await req.json()
    const { event, data } = body

    // 1. Validar que la transacción sea de un pago aprobado
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