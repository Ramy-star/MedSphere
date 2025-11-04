
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
    const body = await req.json();
    const { paramsToSign } = body;

    if (!paramsToSign || typeof paramsToSign !== 'object') {
        return NextResponse.json({ error: 'Missing parameters to sign.' }, { status: 400 });
    }

    if (!process.env.CLOUDINARY_API_SECRET) {
      console.error("Missing Cloudinary API secret");
      return NextResponse.json(
        { error: "Server misconfiguration: missing Cloudinary API secret" },
        { status: 500 }
      );
    }
    
    // Generate the signature using Cloudinary's utility function
    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!);

    // Return the signature and other useful data to the client
    return NextResponse.json({ 
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });

  } catch (err) {
    console.error("Cloudinary sign endpoint error:", err);
    const error = err as Error;
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}
