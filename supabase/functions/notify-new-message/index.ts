import { getSupabaseClient, getUserEmail } from "../_shared/supabase.ts";
import { sendEmail } from "../_shared/resend.ts";
import { newMessageEmail } from "../_shared/email-templates.ts";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: {
    id: string;
    booking_request_id: string | null;
    venue_inquiry_id: string | null;
    sender_id: string;
    content: string;
    created_at: string;
  };
  old_record: null | Record<string, unknown>;
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();

    if (payload.type !== "INSERT") {
      return new Response(JSON.stringify({ skipped: "Not an INSERT" }), { status: 200 });
    }

    const { booking_request_id, venue_inquiry_id, sender_id, content } = payload.record;

    const supabase = getSupabaseClient();

    let recipientId: string;
    let venueName: string;

    if (booking_request_id) {
      // --- Booking request message path (existing) ---
      const { data: booking, error: bookingError } = await supabase
        .from("booking_requests")
        .select(`
          customer_id,
          venue:venue_id (
            name,
            owner_id
          )
        `)
        .eq("id", booking_request_id)
        .single();

      if (bookingError || !booking) {
        console.error("Booking not found:", bookingError);
        return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404 });
      }

      const venue = booking.venue as { name: string; owner_id: string };
      venueName = venue.name;
      recipientId = sender_id === booking.customer_id ? venue.owner_id : booking.customer_id;
    } else if (venue_inquiry_id) {
      // --- Venue inquiry message path (new) ---
      const { data: inquiry, error: inquiryError } = await supabase
        .from("venue_inquiries")
        .select("venue_id, user_id")
        .eq("id", venue_inquiry_id)
        .single();

      if (inquiryError || !inquiry) {
        console.error("Inquiry not found:", inquiryError);
        return new Response(JSON.stringify({ error: "Inquiry not found" }), { status: 404 });
      }

      const { data: venue, error: venueError } = await supabase
        .from("venues")
        .select("name, owner_id")
        .eq("id", inquiry.venue_id)
        .single();

      if (venueError || !venue) {
        console.error("Venue not found:", venueError);
        return new Response(JSON.stringify({ error: "Venue not found" }), { status: 404 });
      }

      venueName = venue.name;
      recipientId = sender_id === inquiry.user_id ? venue.owner_id : inquiry.user_id;
    } else {
      // Neither FK set — should not happen due to CHECK constraint
      console.warn("Message has neither booking_request_id nor venue_inquiry_id:", payload.record.id);
      return new Response(JSON.stringify({ skipped: "No thread reference" }), { status: 200 });
    }

    if (!recipientId) {
      console.error("No recipient found");
      return new Response(JSON.stringify({ error: "Recipient not found" }), { status: 404 });
    }

    // Get recipient email
    const recipientEmail = await getUserEmail(recipientId);
    if (!recipientEmail) {
      console.error("Recipient email not found:", recipientId);
      return new Response(JSON.stringify({ error: "Recipient email not found" }), { status: 404 });
    }

    // Get sender name
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", sender_id)
      .single();

    const senderName = senderProfile?.full_name || "Någon";
    const messagePreview = content.length > 150 ? content.substring(0, 150) + "..." : content;

    // Send notification
    const result = await sendEmail({
      to: recipientEmail,
      subject: `Nytt meddelande från ${senderName}`,
      html: newMessageEmail(senderName, venueName, messagePreview),
    });

    if (!result.success) {
      console.error("Failed to send email:", result.error);
      return new Response(JSON.stringify({ error: result.error }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Error in notify-new-message:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
