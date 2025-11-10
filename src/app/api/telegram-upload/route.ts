
import { NextRequest, NextResponse } from "next/server";
import { fileService } from "@/lib/fileService";
import type { UploadCallbacks } from "@/lib/fileService";
import type { Content } from "@/lib/contentService";

const INBOX_FOLDER_ID = 'telegram-inbox-folder';
const UPLOAD_SECRET = process.env.TELEGRAM_UPLOAD_SECRET;

export async function POST(req: NextRequest) {
    if (!UPLOAD_SECRET) {
        console.error("TELEGRAM_UPLOAD_SECRET is not set in environment variables.");
        return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
    }

    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${UPLOAD_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file found in the request." }, { status: 400 });
        }

        const uploadResult = await new Promise<Content>((resolve, reject) => {
            const callbacks: UploadCallbacks = {
                onProgress: (progress: number) => {
                    console.log(`Telegram upload progress: ${progress.toFixed(2)}%`);
                },
                onSuccess: (content: Content) => {
                    console.log(`Successfully uploaded file from Telegram: ${content.name}`);
                    resolve(content);
                },
                onError: (error: Error) => {
                    console.error(`Error during Telegram file upload process: ${error.message}`);
                    reject(error);
                },
            };

            // This function will handle the upload to Cloudinary and Firestore creation
            fileService.createFile(INBOX_FOLDER_ID, file, callbacks).catch(reject);
        });
        
        return NextResponse.json({ success: true, message: `File "${uploadResult.name}" uploaded to Inbox.` });

    } catch (err: any) {
        console.error("Error handling Telegram upload:", err);
        return NextResponse.json({ error: "Internal server error", details: err.message }, { status: 500 });
    }
}
