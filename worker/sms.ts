import { Bindings } from './index';

export const sendVerificationSMS = async (env: Bindings, mobile: string, otp: string) => {
  if (!env.SMS_PROVIDER_API_KEY || !env.SMS_PROVIDER_ACCOUNT_ID || !env.SMS_FROM_NUMBER) {
    console.log('[SMS Abstraction] SMS_PROVIDER_API_KEY, ACCOUNT_ID, or FROM_NUMBER not configured. Cannot send SMS.');
    return { success: false, error: 'SMS provider not configured.' };
  }

  try {
    // Abstracted integration with Twilio API
    const url = `https://api.twilio.com/2010-04-01/Accounts/${env.SMS_PROVIDER_ACCOUNT_ID}/Messages.json`;
    
    const params = new URLSearchParams();
    params.append('To', mobile);
    params.append('From', env.SMS_FROM_NUMBER);
    params.append('Body', `LumiLove verification code: ${otp}. This code expires in 10 minutes.`);

    const auth = btoa(`${env.SMS_PROVIDER_ACCOUNT_ID}:${env.SMS_PROVIDER_API_KEY}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!res.ok) {
      console.error(`[SMS Abstraction] Provider returned ${res.status} ${res.statusText}`);
      return { success: false, error: 'Failed to send SMS. Provider error.' };
    }

    return { success: true };
  } catch (error) {
    console.error(`[SMS Abstraction] Network or unexpected error`);
    return { success: false, error: 'Failed to connect to SMS provider.' };
  }
};
