import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { name, email } = await request.json();

    // Validate inputs
    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: 'Name and email are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get Resend API key from environment
    const resendApiKey = import.meta.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);

    // Prepare email content
    const subject = `Resume Request from ${name}`;
    const textBody = `
Name: ${name}
Email: ${email}

A new resume request has been submitted from your portfolio website.

Sent at: ${new Date().toLocaleString()}
    `.trim();

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Resume Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280;">A new resume request has been submitted from your portfolio website.</p>
        <p style="color: #6b7280; font-size: 12px;">Sent at: ${new Date().toLocaleString()}</p>
      </div>
    `;

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Portfolio <onboarding@resend.dev>', // You can customize this after verifying your domain
      to: 'jasani.rohan@gmail.com',
      subject: subject,
      text: textBody,
      html: htmlBody,
      replyTo: email,
    });

    if (error) {
      console.error('Resend error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Email sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, message: 'Request submitted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Resume request error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
