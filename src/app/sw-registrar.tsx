
'use client';

import { useEffect } from 'react';

export default function SWRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      import('workbox-window').then(({ Workbox }) => {
        const wb = new Workbox('/sw.js');

        // This is a common strategy to prompt the user to reload when a new version is available.
        const promptToReload = () => {
          console.log('A new version of this web app is available. Please reload to update.');
          // You can implement a UI toast or notification here to ask the user to reload.
        };

        wb.addEventListener('waiting', promptToReload);

        // Register the service worker
        wb.register()
          .then(registration => {
            console.log('Service Worker registered with scope:', registration?.scope);
          })
          .catch(error => {
            console.error('Service Worker registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}
