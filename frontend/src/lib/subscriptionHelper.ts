import { supabase } from "./supabaseClient";

/**
 * Crée des abonnements pour tous les membres qui n'en ont pas
 * en fonction de leur discipline
 */
export async function createMissingSubscriptions() {
  try {
    // 1. Récupérer tous les membres
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id, discipline, first_name, last_name");

    if (membersError) throw membersError;
    if (!members) return { success: 0, errors: 0 };

    // 2. Récupérer tous les membres qui ont déjà un abonnement
    const { data: existingSubs, error: subsError } = await supabase
      .from("subscriptions")
      .select("member_id");

    if (subsError) throw subsError;

    const membersWithSubs = new Set(
      (existingSubs || []).map((s: any) => s.member_id)
    );

    // 3. Filtrer les membres sans abonnement
    const membersWithoutSubs = members.filter(
      (m) => !membersWithSubs.has(m.id)
    );

    console.log(`Membres sans abonnement: ${membersWithoutSubs.length}`);

    if (membersWithoutSubs.length === 0) {
      return { success: 0, errors: 0 };
    }

    // 4. Créer un abonnement mensuel par défaut pour chaque membre
    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    const subscriptionsToCreate = membersWithoutSubs.map((member) => {
      // Plan par défaut selon la discipline
      let planName = "Mensuel";
      const discipline = member.discipline || "boxe";

      return {
        member_id: member.id,
        plan_name: planName,
        discipline: discipline,
        starts_at: today.toISOString().slice(0, 10),
        ends_at: in30Days.toISOString().slice(0, 10),
        status: "active",
      };
    });

    // 5. Insérer par lots de 100
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < subscriptionsToCreate.length; i += 100) {
      const batch = subscriptionsToCreate.slice(i, i + 100);
      const { error } = await supabase.from("subscriptions").insert(batch);

      if (error) {
        console.error(`Erreur batch ${i}-${i + 100}:`, error);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
      }
    }

    console.log(
      `Abonnements créés: ${successCount}, Erreurs: ${errorCount}`
    );
    return { success: successCount, errors: errorCount };
  } catch (error) {
    console.error("Erreur lors de la création des abonnements:", error);
    throw error;
  }
}

/**
 * Récupère les statistiques des membres avec leurs abonnements
 */
export async function getMemberStats() {
  try {
    // Utiliser la vue v_member_status si elle existe
    const { data, error } = await supabase
      .from("v_member_status")
      .select("*");

    if (error) {
      console.warn("Vue v_member_status non disponible:", error);

      // Fallback: requête directe
      const { data: members, error: membersError } = await supabase
        .from("members")
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          card_uid,
          status,
          discipline,
          last_scan_at
        `);

      if (membersError) throw membersError;

      return members || [];
    }

    return data || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des stats:", error);
    return [];
  }
}
