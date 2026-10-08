import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendEmail } from '@/lib/email-service';
import { EmailConfig } from '@/lib/visitor-config';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { testRecipient, emailConfig } = body;

    if (!testRecipient || !testRecipient.includes('@')) {
      return NextResponse.json(
        { error: 'Harap masukkan alamat email tujuan uji coba yang valid.' },
        { status: 400 }
      );
    }

    const config: EmailConfig = emailConfig || { provider: 'azure' };
    const providerName = config.provider.toUpperCase();

    const subject = `[Test Connection] Uji Coba Email Service (${providerName})`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #801517; padding: 20px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px;">Uji Coba Pengiriman Email Berhasil ✅</h2>
          <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">CS Portal CRM Email Gateway</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff; color: #1e293b;">
          <p style="font-size: 15px; margin-top: 0;">Halo Admin,</p>
          <p style="font-size: 14px; line-height: 1.5;">
            Pengaturan email Anda dengan provider <strong>${providerName}</strong> telah berhasil diverifikasi dan dapat mengirimkan pesan dengan baik.
          </p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin: 20px 0; font-size: 13px;">
            <p style="margin: 4px 0;"><strong>Provider:</strong> ${providerName}</p>
            <p style="margin: 4px 0;"><strong>Tujuan:</strong> ${testRecipient}</p>
            <p style="margin: 4px 0;"><strong>Waktu Kirim:</strong> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>
          </div>

          <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
            Sistem ini akan digunakan untuk mengirimkan notifikasi formulir keluhan/kendala pengunjung langsung ke email perusahaan Anda.
          </p>
        </div>
        <div style="background-color: #f8fafc; padding: 12px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
          CEO SUITE CS Portal CRM • Email Service Test
        </div>
      </div>
    `;

    const result = await sendEmail({
      to: testRecipient.trim(),
      subject,
      html,
      config,
    });

    return NextResponse.json({
      success: true,
      provider: result.provider,
      messageId: result.messageId,
      message: `Email uji coba berhasil dikirim ke ${testRecipient} via ${result.provider.toUpperCase()}!`,
    });
  } catch (error: any) {
    console.error('[Email Test API Error]', error);
    return NextResponse.json(
      {
        error: error.message || 'Gagal mengirim email uji coba. Periksa kredensial konfigurasi Anda.',
      },
      { status: 500 }
    );
  }
}
