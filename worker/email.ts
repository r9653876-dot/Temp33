import { Bindings } from './index';

export const sendVerificationEmail = async (env: Bindings, email: string, otp: string) => {
  if (!env.EMAIL_PROVIDER_API_KEY) {
    console.log('[Email Abstraction] EMAIL_PROVIDER_API_KEY not configured. Cannot send email.');
    return { success: false, error: 'Email provider not configured.' };
  }
  
  const fromAddress = env.EMAIL_FROM_ADDRESS || 'noreply@lumilove.example.com';
  const fromName = env.EMAIL_FROM_NAME || 'LumiLove';

  try {
    // Abstracted integration with Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.EMAIL_PROVIDER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${fromName} <${fromAddress}>`,
        to: email,
        subject: 'Verify your email - LumiLove',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Verify your email</h2>
            <p style="color: #555;">Welcome to LumiLove. Please use the following 6-digit code to verify your email address.</p>
            <h1 style="letter-spacing: 5px; color: #d946ef; text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">${otp}</h1>
            <p style="color: #777; font-size: 14px;">This code expires in 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `
      })
    });

    if (!res.ok) {
      console.error(`[Email Abstraction] Provider returned ${res.status} ${res.statusText}`);
      return { success: false, error: 'Failed to send verification email. Provider error.' };
    }

    return { success: true };
  } catch (error) {
    console.error(`[Email Abstraction] Network or unexpected error`);
    return { success: false, error: 'Failed to connect to email provider.' };
  }
};
