import { sendEmail } from "../_shared/resend.ts";
import { confirmationEmail, passwordResetEmail } from "../_shared/email-templates.ts";
import * as base64 from "https://deno.land/std@0.168.0/encoding/base64.ts";

interface AuthHookPayload {
  user: {
    id: string;
    email: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token_hash: string;
    redirect_to: string;
    email_action_type: "signup" | "recovery" | "invite" | "email_change" | "magiclink";
  };
}

async function verifyWebhookSignature(req: Request, body: string): Promise<boolean> {
  const signature = req.headers.get("webhook-signature");
  const timestamp = req.headers.get("webhook-timestamp");

  if (!signature || !timestamp) {
    console.error("Missing signature headers");
    return false;
  }

  const secret = Deno.env.get("AUTH_HOOK_SECRET");
  if (!secret) {
    console.error("AUTH_HOOK_SECRET not configured");
    return false;
  }

  const secretKey = secret.replace(/^v1,whsec_/, "");

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      base64.decode(secretKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const webhookId = req.headers.get("webhook-id") || "";
    const signedPayload = `${webhookId}.${timestamp}.${body}`;

    const expectedSignatureBytes = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload))
    );
    const expectedSignature = base64.encode(expectedSignatureBytes);
    const providedSignature = signature.replace(/^v1,/, "");

    return expectedSignature === providedSignature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    const body = await req.text();

    const isValid = await verifyWebhookSignature(req, body);
    if (!isValid) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload: AuthHookPayload = JSON.parse(body);
    const { user, email_data } = payload;

    // Only handle signup and recovery
    if (email_data.email_action_type !== "signup" && email_data.email_action_type !== "recovery") {
      return new Response(JSON.stringify({ error: "Email type not supported" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userEmail = user.email;
    if (!userEmail) {
      return new Response(JSON.stringify({ error: "User email not found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const siteUrl = Deno.env.get("SITE_URL") || "http://localhost:3000";

    let subject: string;
    let html: string;

    if (email_data.email_action_type === "signup") {
      const confirmationUrl = `${siteUrl}/auth/confirm?token_hash=${email_data.token_hash}&type=${email_data.email_action_type}`;
      subject = "Bekräfta din e-postadress - Tryffle";
      html = confirmationEmail(confirmationUrl);
    } else {
      const resetUrl = `${siteUrl}/auth/confirm?token_hash=${email_data.token_hash}&type=${email_data.email_action_type}&next=/auth/reset-password`;
      subject = "Återställ ditt lösenord - Tryffle";
      html = passwordResetEmail(resetUrl);
    }

    // Fire and forget for faster response
    sendEmail({ to: userEmail, subject, html })
      .then((result) => {
        if (!result.success) {
          console.error(`Failed to send ${email_data.email_action_type} email:`, result.error);
        } else {
          console.log(`${email_data.email_action_type} email sent to:`, userEmail);
        }
      })
      .catch((error) => {
        console.error("Error sending email:", error);
      });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-auth-email:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
