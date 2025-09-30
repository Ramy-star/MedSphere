
// src/app/api/sign-cloudinary-params/route.ts
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

/**
 * This API route signs parameters for a direct upload to Cloudinary.
 * It expects a POST request with a JSON body containing the parameters
 * that need to be signed.
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
    if (req.method !== "POST") {
      return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
    }

    const paramsToSign = await req.json();

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
    
    // Generate the signature using Cloudinary's utility function
    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!);

    // Return the signature and other useful data to the client
    return NextResponse.json(
      {
        signature,
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

    