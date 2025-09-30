
// src/app/api/sign-cloudinary-params/route.ts
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

/**
 * تأكد من أن المتغيرات التالية موجودة في .env.local:
 * CLOUDINARY_CLOUD_NAME
 * CLOUDINARY_API_KEY
 * CLOUDINARY_API_SECRET
 */

// إعداد Cloudinary (يقوم فقط بقراءة القيم، لا يكشف الـ secret للعميل)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    // ضمان استقبال طلب POST فقط
    if (req.method !== "POST") {
      return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
    }

    const body = await req.json().catch(() => ({} as Record<string, any>));

    // تحقق من إعدادات البيئة
    if (
      !process.env.CLOUDINARY_API_SECRET ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_CLOUD_NAME
    ) {
      console.error("Missing Cloudinary env vars");
      return NextResponse.json(
        { error: "Server misconfiguration: missing Cloudinary environment variables" },
        { status: 500 }
      );
    }

    // timestamp صالح لوقت قصير
    const timestamp = Math.floor(Date.now() / 1000);

    const paramsToSign: Record<string, any> = {
      ...body,
      timestamp
    };

    // توليد التوقيع باستخدام مكتبة cloudinary
    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!);

    // إرجاع التوقيع وبيانات مفيدة أخرى إلى العميل
    return NextResponse.json(
      {
        signature,
        timestamp,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Cloudinary sign endpoint error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
