
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

    // A short-lived timestamp is required for the signature
    const timestamp = Math.floor(Date.now() / 1000);

    // Combine the parameters from the request body with the timestamp
    const paramsToSign: Record<string, any> = {
      ...body,
      timestamp
    };

    // Generate the signature using Cloudinary's utility function
    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!);

    // Return the signature and other useful data to the client
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
    const error = err as Error;
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}

    