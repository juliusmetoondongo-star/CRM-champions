import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, x-api-key',
};

interface ScanRequest {
  uid: string;
  location?: string;
}

const INSURANCE_PRICE_CENTS = 4000;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { uid, location = 'Ixelles' }: ScanRequest = await req.json();

    if (!uid || uid.trim() === '') {
      return new Response(
        JSON.stringify({ success: false, message: 'UID invalide' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const normalizedUid = uid.toUpperCase();

    // 1. Chercher dans la vue v_member_directory qui combine members + member_subscription_info
    const { data: memberDir, error: dirError } = await supabase
      .from('v_member_directory')
      .select('*')
      .or(`card_uid.eq.${normalizedUid},member_code.eq.${normalizedUid}`)
      .maybeSingle();

    if (dirError) {
      console.error('Error fetching from v_member_directory:', dirError);
      return new Response(
        JSON.stringify({ success: false, message: 'Erreur serveur' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!memberDir) {
      await supabase.from('audit_logs').insert({
        actor: 'system',
        action: 'scan_rejected',
        entity: 'checkin',
        meta: { uid, location, reason: 'member_not_found' },
      });

      return new Response(
        JSON.stringify({
          success: false,
          message: 'Membre non reconnu - Carte RFID ou code membre invalide',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Vérifier le statut (member_status depuis member_subscription_info ou status depuis members)
    const memberStatus = memberDir.member_status || memberDir.status || 'unknown';
    
    if (memberStatus !== 'active' && memberDir.status !== 'active') {
      await supabase.from('audit_logs').insert({
        actor: 'system',
        action: 'scan_rejected',
        entity: 'checkin',
        entity_id: memberDir.id,
        meta: { uid, location, reason: 'member_not_active', status: memberStatus },
      });

      return new Response(
        JSON.stringify({
          success: false,
          message: `Accès refusé - Membre ${memberStatus}`,
          member: {
            first_name: memberDir.first_name,
            last_name: memberDir.last_name,
            member_code: memberDir.member_code,
          },
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Vérifier l'abonnement - d'abord dans subscriptions, sinon dans member_subscription_info
    let activeSubscription = null;
    const { data: subFromTable } = await supabase
      .from('subscriptions')
      .select('id, plan_name, price_cents, starts_at, ends_at, status')
      .eq('member_id', memberDir.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (subFromTable) {
      activeSubscription = subFromTable;
    } else if (memberDir.is_active && memberDir.abo_type) {
      // Utiliser les données de member_subscription_info
      activeSubscription = {
        id: null,
        plan_name: memberDir.abo_type,
        price_cents: 0,
        starts_at: memberDir.valid_from,
        ends_at: memberDir.valid_to,
        status: 'active'
      };
    }

    // 4. Calculer le solde dû
    let totalDue = memberDir.amount_due ? (memberDir.amount_due * 100) : 0;
    let totalPaid = 0;
    const debtReasons: string[] = [];

    // Récupérer TOUS les paiements du membre
    const { data: payments } = await supabase
      .from('payments')
      .select('amount_cents, note')
      .eq('member_id', memberDir.id);

    if (payments) {
      totalPaid = payments.reduce((sum, p) => sum + p.amount_cents, 0);
    }

    // Vérifier si l'abonnement de la table subscriptions a été payé
    if (subFromTable && subFromTable.id) {
      const { data: subscriptionPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('member_id', memberDir.id)
        .eq('subscription_id', subFromTable.id)
        .maybeSingle();

      if (!subscriptionPayment && subFromTable.price_cents > 0) {
        totalDue += subFromTable.price_cents;
        debtReasons.push(`Abonnement ${subFromTable.plan_name}: ${(subFromTable.price_cents / 100).toFixed(2)}€`);
      }
    }

    // Vérifier l'assurance
    const currentYear = new Date().getFullYear();
    const { data: insurancePayment } = await supabase
      .from('payments')
      .select('id')
      .eq('member_id', memberDir.id)
      .eq('note', 'Assurance annuelle')
      .gte('paid_at', `${currentYear}-01-01`)
      .maybeSingle();

    if (!insurancePayment) {
      totalDue += INSURANCE_PRICE_CENTS;
      debtReasons.push('Assurance annuelle: 40.00€');
    }

    const amountDue = totalDue - totalPaid;

    console.log('Balance check:', {
      member_code: memberDir.member_code,
      totalDue: totalDue / 100,
      totalPaid: totalPaid / 100,
      amountDue: amountDue / 100,
      debtReasons,
      hasActiveSubscription: !!activeSubscription
    });

    // 5. BLOQUER si le membre doit de l'argent
    if (amountDue > 0) {
      const amountFormatted = `${(amountDue / 100).toFixed(2)}€`;
      const reason = debtReasons.join(', ') || 'Paiement en attente';

      await supabase.from('audit_logs').insert({
        actor: 'system',
        action: 'scan_rejected',
        entity: 'checkin',
        entity_id: memberDir.id,
        meta: {
          uid,
          location,
          reason: 'outstanding_balance',
          amount_due: amountDue / 100,
          payment_note: reason,
          totalDue: totalDue / 100,
          totalPaid: totalPaid / 100
        },
      });

      return new Response(
        JSON.stringify({
          success: false,
          message: `Accès refusé - Paiement de ${amountFormatted} requis`,
          member: {
            first_name: memberDir.first_name,
            last_name: memberDir.last_name,
            member_code: memberDir.member_code,
          },
          balance: {
            amount_due: amountDue / 100,
            note: reason,
          },
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 6. Vérifier qu'il y a un abonnement valide
    if (!activeSubscription) {
      await supabase.from('audit_logs').insert({
        actor: 'system',
        action: 'scan_rejected',
        entity: 'checkin',
        entity_id: memberDir.id,
        meta: { uid, location, reason: 'no_active_subscription' },
      });

      return new Response(
        JSON.stringify({
          success: false,
          message: 'Aucun abonnement actif',
          member: {
            first_name: memberDir.first_name,
            last_name: memberDir.last_name,
            member_code: memberDir.member_code,
          },
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Vérifier que l'abonnement n'est pas expiré
    if (activeSubscription.ends_at) {
      const endsAt = new Date(activeSubscription.ends_at);
      if (endsAt < new Date()) {
        await supabase.from('audit_logs').insert({
          actor: 'system',
          action: 'scan_rejected',
          entity: 'checkin',
          entity_id: memberDir.id,
          meta: { uid, location, reason: 'subscription_expired', ends_at: activeSubscription.ends_at },
        });

        return new Response(
          JSON.stringify({
            success: false,
            message: 'Abonnement expiré',
            member: {
              first_name: memberDir.first_name,
              last_name: memberDir.last_name,
              member_code: memberDir.member_code,
            },
          }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // 7. TOUT EST OK - Enregistrer le check-in
    await supabase.from('checkins').insert({
      member_id: memberDir.id,
      scanned_at: new Date().toISOString(),
      source: 'rfid',
      location,
    });

    await supabase
      .from('members')
      .update({ last_scan_at: new Date().toISOString() })
      .eq('id', memberDir.id);

    await supabase.from('audit_logs').insert({
      actor: `${memberDir.first_name} ${memberDir.last_name}`,
      action: 'checkin',
      entity: 'checkin',
      entity_id: memberDir.id,
      meta: { uid, location, method: 'rfid' },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Accès autorisé - Bienvenue!',
        member: {
          first_name: memberDir.first_name,
          last_name: memberDir.last_name,
          member_code: memberDir.member_code,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Scan error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Erreur interne du serveur',
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});