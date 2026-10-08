import nodemailer from 'nodemailer';
import {
  EmailConfig,
  DEFAULT_EMAIL_CONFIG,
  AzureEmailConfig,
  GmailEmailConfig,
  CustomSmtpConfig,
  getVisitorConfig,
} from './visitor-config';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  config?: EmailConfig;
}

export interface SendEmailResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
}

/**
 * Sends an email using Azure (Microsoft Graph API OAuth2 Client Credentials)
 */
async function sendAzureEmail(
  azure: AzureEmailConfig,
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<SendEmailResult> {
  const { tenantId, clientId, clientSecret, senderEmail, subjectPrefix, senderName } = azure;

  if (!tenantId || !clientId || !clientSecret || !senderEmail) {
    throw new Error(
      'Konfigurasi Azure Email belum lengkap. Pastikan Tenant ID, Client ID, Client Secret, dan Sender Email terisi.'
    );
  }

  // 1. Fetch OAuth2 token from Microsoft identity platform
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams.toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Autentikasi Azure OAuth2 gagal (${tokenRes.status}): ${errText}`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    throw new Error('Respon Azure OAuth2 tidak memuat access_token yang valid.');
  }

  // 2. Format subject with prefix if present
  const formattedSubject = subjectPrefix ? `[${subjectPrefix}] ${subject}` : subject;

  // 3. Send email via Microsoft Graph API sendMail endpoint
  const sendMailUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`;
  const mailPayload = {
    message: {
      subject: formattedSubject,
      body: {
        contentType: 'HTML',
        content: html,
      },
      from: senderName
        ? {
            emailAddress: {
              name: senderName,
              address: senderEmail,
            },
          }
        : undefined,
      toRecipients: [
        {
          emailAddress: {
            address: to,
          },
        },
      ],
    },
    saveToSentItems: false,
  };

  const sendRes = await fetch(sendMailUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mailPayload),
  });

  if (!sendRes.ok && sendRes.status !== 202) {
    const errText = await sendRes.text();
    throw new Error(`Microsoft Graph sendMail gagal (${sendRes.status}): ${errText}`);
  }

  return {
    success: true,
    provider: 'azure',
    messageId: `azure_${Date.now()}`,
  };
}

/**
 * Sends an email using Gmail SMTP
 */
async function sendGmailEmail(
  gmail: GmailEmailConfig,
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<SendEmailResult> {
  if (!gmail.user || !gmail.appPassword) {
    throw new Error('Konfigurasi Gmail belum lengkap (User email atau App Password masih kosong).');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmail.user,
      pass: gmail.appPassword.replace(/\s+/g, ''),
    },
  });

  const from = gmail.senderName ? `"${gmail.senderName}" <${gmail.user}>` : gmail.user;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
  });

  return {
    success: true,
    provider: 'gmail',
    messageId: info.messageId,
  };
}

/**
 * Sends an email using Custom SMTP
 */
async function sendCustomSmtpEmail(
  custom: CustomSmtpConfig,
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<SendEmailResult> {
  if (!custom.host || !custom.user || !custom.pass) {
    throw new Error('Konfigurasi Custom SMTP belum lengkap (Host, Username, atau Password masih kosong).');
  }

  const transporter = nodemailer.createTransport({
    host: custom.host,
    port: custom.port || 587,
    secure: custom.secure ?? custom.port === 465,
    auth: {
      user: custom.user,
      pass: custom.pass,
    },
  });

  const fromEmail = custom.senderEmail || custom.user;
  const from = custom.senderName ? `"${custom.senderName}" <${fromEmail}>` : fromEmail;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
  });

  return {
    success: true,
    provider: 'custom',
    messageId: info.messageId,
  };
}

/**
 * Main dispatcher to send an email with the selected provider
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const config = options.config || DEFAULT_EMAIL_CONFIG;
  const provider = config.provider || 'azure';

  if (provider === 'none') {
    console.log(
      `[EmailService] Provider 'none' dipilih. Email ke <${options.to}> dicatat di log saja. Subjek: ${options.subject}`
    );
    return { success: true, provider: 'none', messageId: `mock_${Date.now()}` };
  }

  if (provider === 'azure') {
    const azureConfig = config.azure || DEFAULT_EMAIL_CONFIG.azure!;
    return await sendAzureEmail(azureConfig, options.to, options.subject, options.html, options.text);
  }

  if (provider === 'gmail') {
    const gmailConfig = config.gmail || DEFAULT_EMAIL_CONFIG.gmail!;
    return await sendGmailEmail(gmailConfig, options.to, options.subject, options.html, options.text);
  }

  if (provider === 'custom') {
    const customConfig = config.custom || DEFAULT_EMAIL_CONFIG.custom!;
    return await sendCustomSmtpEmail(customConfig, options.to, options.subject, options.html, options.text);
  }

  throw new Error(`Provider email tidak dikenali: ${provider}`);
}

export interface InquiryData {
  category: string;
  description: string;
  name?: string | null;
  email?: string | null;
  company?: string | null;
  sessionId?: string | null;
}

/**
 * Dispatches a formatted notification email to the tenant's fallback email
 */
export async function sendInquiryNotificationToTenant(
  tenant: { id: string; name?: string; fallbackEmail?: string | null; visitorConfig?: any },
  inquiry: InquiryData
): Promise<SendEmailResult | null> {
  const targetEmail = tenant.fallbackEmail?.trim();
  if (!targetEmail) {
    console.log(`[EmailService] Tenant ${tenant.id} belum mengatur fallbackEmail. Notifikasi email dilewati.`);
    return null;
  }

  const vConfig = getVisitorConfig(tenant.visitorConfig);
  const emailConfig = vConfig.emailConfig;

  const subject = `Laporan Baru Pengunjung: [${inquiry.category}] - ${inquiry.name || 'Pengunjung'}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #801517; padding: 20px; color: #ffffff;">
        <h2 style="margin: 0; font-size: 20px;">Laporan Masalah / Kebutuhan Pengunjung</h2>
        <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Diterima melalui CS Portal Widget & Mobile Funnel</p>
      </div>
      <div style="padding: 24px; background-color: #ffffff; color: #1e293b;">
        <p style="font-size: 15px; margin-top: 0;">Halo Tim Support <strong>${tenant.name || 'Perusahaan'}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.5;">Pengunjung aplikasi telah mengirimkan formulir laporan kendala saat bantuan live agen sedang dialihkan:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; font-weight: bold; width: 140px; color: #64748b;">Kategori Masalah:</td>
            <td style="padding: 10px 0; font-weight: bold; color: #801517;"><span style="background-color: #fef2f2; color: #991b1b; padding: 4px 8px; border-radius: 4px;">${inquiry.category}</span></td>
          </tr>
          ${
            inquiry.name
              ? `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Nama Pengunjung:</td>
            <td style="padding: 10px 0; color: #0f172a;">${inquiry.name}</td>
          </tr>`
              : ''
          }
          ${
            inquiry.company
              ? `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Perusahaan:</td>
            <td style="padding: 10px 0; color: #0f172a;">${inquiry.company}</td>
          </tr>`
              : ''
          }
          ${
            inquiry.email
              ? `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Email Kontak:</td>
            <td style="padding: 10px 0; color: #0f172a;"><a href="mailto:${inquiry.email}" style="color: #2563eb; text-decoration: none;">${inquiry.email}</a></td>
          </tr>`
              : ''
          }
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; font-weight: bold; color: #64748b; vertical-align: top;">Deskripsi Masalah:</td>
            <td style="padding: 10px 0; color: #0f172a; white-space: pre-wrap; line-height: 1.5;">${inquiry.description}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Waktu Pengiriman:</td>
            <td style="padding: 10px 0; color: #64748b;">${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</td>
          </tr>
        </table>

        <div style="margin-top: 24px; padding: 14px; background-color: #f8fafc; border-radius: 6px; text-align: center;">
          <p style="margin: 0; font-size: 13px; color: #64748b;">Anda dapat meninjau riwayat percakapan dan profil prospek ini langsung di Dashboard CRM.</p>
        </div>
      </div>
      <div style="background-color: #f8fafc; padding: 14px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
        Email ini dikirim otomatis oleh CEOSUITE CS Portal AI Concierge (${emailConfig?.provider ? emailConfig.provider.toUpperCase() : 'EMAIL SERVICE'}).
      </div>
    </div>
  `;

  try {
    const result = await sendEmail({
      to: targetEmail,
      subject,
      html,
      config: emailConfig,
    });
    console.log(
      `[EmailService] Inquiry notification dispatched to <${targetEmail}> via ${result.provider} (msgId: ${result.messageId})`
    );
    return result;
  } catch (error: any) {
    console.error(`[EmailService] Failed to send inquiry notification to <${targetEmail}>:`, error);
    return {
      success: false,
      provider: emailConfig?.provider || 'unknown',
      error: error.message || String(error),
    };
  }
}
