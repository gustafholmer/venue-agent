import { getSupabaseClient, getUserEmail } from "../_shared/supabase.ts";
import { sendEmail } from "../_shared/resend.ts";
import { inquiryRequestEmail } from "../_shared/email-templates.ts";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: {
    id: string;
    venue_id: string;
    user_id: string;
    event_date: string;
    event_type: string;
    guest_count: number;
    message: string;
    status: string;
  };
  old_record: null | Record<string, unknown>;
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();

    // Only notify on new inquiries
    if (payload.type !== "INSERT") {
      return new Response(JSON.stringify({ skipped: "Not an INSERT" }), { status: 200 });
    }

    const { venue_id, user_id, event_type, event_date, guest_count, message } = payload.record;

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

    // Get inquiry creator's profile for their name
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found:", profileError);
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404 });
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

    const customerName = profile.full_name || "Okänd användare";

    // Truncate message for preview
    const messagePreview = message.length > 200 ? message.slice(0, 200) + "..." : message;

    // Send notification email
    const result = await sendEmail({
      to: ownerEmail,
      subject: `Ny förfrågan för ${venue.name}`,
      html: inquiryRequestEmail(
        customerName,
        venue.name,
        event_type,
        formattedDate,
        guest_count,
        messagePreview
      ),
    });

    if (!result.success) {
      console.error("Failed to send email:", result.error);
      return new Response(JSON.stringify({ error: result.error }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Error in notify-new-inquiry:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
