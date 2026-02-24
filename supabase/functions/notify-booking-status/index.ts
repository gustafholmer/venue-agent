import { getSupabaseClient } from "../_shared/supabase.ts";
import { sendEmail } from "../_shared/resend.ts";
import {
  bookingAcceptedEmail,
  bookingDeclinedEmail,
} from "../_shared/email-templates.ts";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: {
    id: string;
    venue_id: string;
    customer_id: string | null;
    customer_name: string;
    customer_email: string;
    event_date: string;
    status: string;
    decline_reason: string | null;
  };
  old_record: {
    status: string;
    [key: string]: unknown;
  } | null;
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();

    // Only handle UPDATE events
    if (payload.type !== "UPDATE") {
      return new Response(JSON.stringify({ skipped: "Not an UPDATE" }), {
        status: 200,
      });
    }

    const { record, old_record } = payload;

    // Only proceed if status actually changed
    if (!old_record || old_record.status === record.status) {
      return new Response(
        JSON.stringify({ skipped: "Status did not change" }),
        { status: 200 }
      );
    }

    // Only handle accepted or declined
    if (record.status !== "accepted" && record.status !== "declined") {
      return new Response(
        JSON.stringify({ skipped: `Status '${record.status}' not handled` }),
        { status: 200 }
      );
    }

    const supabase = getSupabaseClient();

    // Get venue info
    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select("name, owner_id")
      .eq("id", record.venue_id)
      .single();

    if (venueError || !venue) {
      console.error("Venue not found:", venueError);
      return new Response(JSON.stringify({ error: "Venue not found" }), {
        status: 404,
      });
    }

    // Format date for email
    const formattedDate = new Date(record.event_date).toLocaleDateString(
      "sv-SE",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    // Get owner profile name for accepted email
    let ownerName = "lokalägaren";
    if (record.status === "accepted") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", venue.owner_id)
        .single();
      if (profile?.full_name) {
        ownerName = profile.full_name;
      }
    }

    // Pick template and subject
    const isAccepted = record.status === "accepted";
    const subject = isAccepted
      ? `Din bokning av ${venue.name} är bekräftad!`
      : `Uppdatering om din bokning av ${venue.name}`;
    const html = isAccepted
      ? bookingAcceptedEmail(venue.name, formattedDate, ownerName)
      : bookingDeclinedEmail(
          venue.name,
          formattedDate,
          record.decline_reason || undefined
        );

    // Send email to customer
    const result = await sendEmail({
      to: record.customer_email,
      subject,
      html,
    });

    if (!result.success) {
      console.error("Failed to send email:", result.error);
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
      });
    }

    return new Response(
      JSON.stringify({ success: true, status: record.status }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in notify-booking-status:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
});
