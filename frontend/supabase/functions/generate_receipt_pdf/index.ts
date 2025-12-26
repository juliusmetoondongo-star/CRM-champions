// functions/generate_receipt_pdf/index.ts
// Deno Edge Function — génère un PDF "Reçu" et le stocke dans Storage "receipts"

import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { member, payment } = await req.json();

    if (!member?.id || !payment?.id) {
      return new Response(
        JSON.stringify({ error: "Missing member or payment" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1) Build a small receipt PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const draw = (text: string, x: number, y: number, bold = false, size = 12) => {
      page.drawText(text, { x, y, size, font: bold ? fontBold : font, color: rgb(0.15, 0.15, 0.2) });
    };

    let y = 800;
    draw("Champion's Academy", 50, y, true, 18); y -= 26;
    draw("Reçu / Receipt", 50, y, true, 14); y -= 30;

    // Membre
    draw("Membre:", 50, y, true); y -= 16;
    draw(`${member.first_name ?? ""} ${member.last_name ?? ""}`, 50, y); y -= 14;
    if (member.email) { draw(`${member.email}`, 50, y); y -= 14; }
    if (member.phone) { draw(`${member.phone}`, 50, y); y -= 14; }
    y -= 10;

    // Paiement
    draw("Paiement:", 50, y, true); y -= 16;
    draw(`ID: ${payment.id}`, 50, y); y -= 14;
    draw(`Type: ${payment.category ?? payment.type ?? "payment"}`, 50, y); y -= 14;
    draw(`Montant: ${(payment.amount_cents / 100).toFixed(2)} ${payment.currency}`, 50, y); y -= 14;
    draw(`Méthode: ${payment.method ?? "—"}`, 50, y); y -= 14;
    draw(`Payé le: ${payment.paid_at ? new Date(payment.paid_at).toLocaleString("fr-FR") : "—"}`, 50, y); y -= 20;

    draw("Merci pour votre paiement.", 50, y);

    const pdfBytes = await pdfDoc.save();

    // 2) Upload to Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    const bucket = "receipts";
    const path = `${member.id}/receipt_${payment.id}.pdf`;

    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, new Blob([pdfBytes], { type: "application/pdf" }), { upsert: true });

    if (upErr) {
      console.error(upErr);
      return new Response(JSON.stringify({ error: "Upload error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Public URL
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);

    return new Response(JSON.stringify({ url: pub.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});