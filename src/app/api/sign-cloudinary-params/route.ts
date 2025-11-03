// src/app/api/sign-cloudinary-params/route.ts
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

/**
 * This API route signs parameters for a direct upload to Cloudinary.
 * It now generates the timestamp on the server to ensure consistency.
 *
 * Make sure the following environment variables are set:
 * CLOUDINARY_CLOUD_NAME
 * CLOUDINARY_API_KEY
 * CLOUDINARY_API_SECRET
 */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // The client now sends other parameters like folder, public_id, etc.
    const { paramsToSign } = body;

    if (!process.env.CLOUDINARY_API_SECRET) {
      console.error("Missing Cloudinary API secret");
      return NextResponse.json(
        { error: "Server misconfiguration: missing Cloudinary API secret" },
        { status: 500 }
      );
    }
    
    // Generate timestamp on the server
    const timestamp = Math.round(new Date().getTime() / 1000);

    const fullParamsToSign = {
      ...paramsToSign,
      timestamp,
    };

    // Generate the signature using Cloudinary's utility function
    const signature = cloudinary.utils.api_sign_request(fullParamsToSign, process.env.CLOUDINARY_API_SECRET!);

    // Return the signature and the exact timestamp that was signed
    return NextResponse.json({ 
        signature,
        timestamp: timestamp,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });

  } catch (err) {
    console.error("Cloudinary sign endpoint error:", err);
    const error = err as Error;
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}

    