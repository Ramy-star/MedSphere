
// src/app/api/delete-cloudinary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    // Ensure this is a POST request
    if (req.method !== 'POST') {
      return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
    }

    const { publicId, resourceType } = await req.json();
    if (!publicId) {
      return NextResponse.json({ error: 'Missing publicId' }, { status: 400 });
    }

    // Ensure Cloudinary is configured
    if (
      !process.env.CLOUDINARY_API_SECRET ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_CLOUD_NAME
    ) {
      console.error('Missing Cloudinary env vars for deletion');
      return NextResponse.json(
        { error: 'Server misconfiguration: missing Cloudinary environment variables' },
        { status: 500 }
      );
    }
    
    // Call Cloudinary's destroy method to delete the asset
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType || 'raw',
    });

    // Check the result from Cloudinary
    if (result.result !== 'ok' && result.result !== 'not found') {
        throw new Error(`Cloudinary deletion failed for public_id ${publicId} with resource_type ${resourceType}: ${result.result}`);
    }

    return NextResponse.json({ success: true, result }, { status: 200 });

  } catch (err: any) {
    console.error('Cloudinary delete endpoint error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}

    