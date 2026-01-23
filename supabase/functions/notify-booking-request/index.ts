import { getSupabaseClient, getUserEmail } from "../_shared/supabase.ts";
import { sendEmail } from "../_shared/resend.ts";
import { bookingRequestEmail } from "../_shared/email-templates.ts";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: {
    id: string;
    venue_id: string;
    customer_id: string | null;
    event_type: string | null;
    event_date: string;
    guest_count: number | null;
    customer_name: string;
    customer_email: string;
    status: string;
  };
  old_record: null | Record<string, unknown>;
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();

    // Only notify on new booking requests
    if (payload.type !== "INSERT") {
      return new Response(JSON.stringify({ skipped: "Not an INSERT" }), { status: 200 });
    }

    const { venue_id, customer_name, event_type, event_date, guest_count } = payload.record;

    const supabase = getSupabaseClient();

    // Get venue and owner info
    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select("name, owner_id")
      .eq("id", venue_id)
      .single();

    if (venueError || !venue) {
      console.error("Venue not found:", venueError);
      return new Response(JSON.stringify({ error: "Venue not found" }), { status: 404 });
    }

    // Get owner email
    const ownerEmail = await getUserEmail(venue.owner_id);
    if (!ownerEmail) {
      console.error("Owner email not found for:", venue.owner_id);
      return new Response(JSON.stringify({ error: "Owner email not found" }), { status: 404 });
    }

    // Format date
    const formattedDate = new Date(event_date).toLocaleDateString("sv-SE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Send notification email
    const result = await sendEmail({
      to: ownerEmail,
      subject: `Ny bokningsförfrågan för ${venue.name}`,
      html: bookingRequestEmail(
        customer_name,
        venue.name,
        event_type || "Event",
        formattedDate,
        guest_count || 0
      ),
    });

    if (!result.success) {
      console.error("Failed to send email:", result.error);
      return new Response(JSON.stringify({ error: result.error }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Error in notify-booking-request:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
