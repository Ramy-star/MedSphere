'use client';
import React, { useRef } from 'react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import QRCode from 'qrcode.react';

const ShareCardPage = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const siteUrl = 'https://medsphere.vercel.app';

  const handleDownload = async () => {
    if (cardRef.current === null) {
      return;
    }
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 16 });
      const link = document.createElement('a');
      link.download = 'medsphere-share-card.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download image', err);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-8 bg-background flex-1">
      <div
        ref={cardRef}
        className="w-full max-w-md bg-white text-slate-800 p-8 shadow-2xl"
      >
        <div className="flex items-center justify-center gap-3">
          <Logo className="h-14 w-14 text-slate-900" />
          <h1 className="text-4xl font-bold">
            <span className="font-extrabold text-slate-900">Med</span>
            <span className="font-normal text-green-600">Sphere</span>
          </h1>
        </div>
        <p className="text-center text-slate-600 mt-4 text-base">
          Your all-in-one digital companion to organize, access, and master your medical study materials effortlessly.
        </p>
        
        <div className="mt-8 flex items-center justify-center">
            <QRCode
                value={siteUrl}
                size={220}
                bgColor="#ffffff"
                fgColor="#1e293b"
                level="H"
                includeMargin={false}
                imageSettings={{
                    src: "/logo.svg",
                    height: 40,
                    width: 40,
                    excavate: true,
                }}
            />
        </div>

        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-center block text-blue-600 font-semibold mt-8 hover:underline"
        >
          {siteUrl}
        </a>
      </div>
      <Button onClick={handleDownload} className="mt-8 rounded-full h-12 px-6 text-base">
        <Download className="mr-2 h-5 w-5" />
        Download Image
      </Button>
    </div>
  );
};

export default ShareCardPage;
