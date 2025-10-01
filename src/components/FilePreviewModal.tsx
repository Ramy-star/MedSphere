

'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import FilePreview from './FilePreview';
import type { Content } from '@/lib/contentService';
import { useEffect, useState, useRef } from 'react';
import { X, Download, Share2, File as FileIcon, ExternalLink, Sparkles, MessageCircle, Send } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/auth/use-user';
import { AnimatePresence, motion } from 'framer-motion';
import { Textarea } from './ui/textarea';
import { chatAboutDocument } from '@/ai/flows/chat-flow';
import { Skeleton } from './ui/skeleton';

// Define a type for the ref to hold the text extraction function
type PdfViewerRef = {
  extractText: () => Promise<string>;
};

export function FilePreviewModal({ item, onOpenChange }: { item: Content | null, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { user } = useUser();
  const isAdmin = user?.uid === process.env.NEXT_PUBLIC_ADMIN_UID;
  const pdfViewerRef = useRef<PdfViewerRef>(null);
  
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [documentText, setDocumentText] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);


  const fileUrl = item?.metadata?.storagePath;
  const loading = false; // No loading needed for direct URL

  useEffect(() => {
    // Reset state when a new item is opened
    setShowChat(false);
    setChatHistory([]);
    setChatInput('');
    setDocumentText(null);
    setIsExtracting(false);
  }, [item]);


  if (!item) return null;

  const handleDownload = async () => {
    if (!fileUrl || !item) return;
    try {
        const res = await fetch(fileUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error("Download failed:", error);
        toast({
            variant: "destructive",
            title: "Download Failed",
            description: "Could not download the file.",
        });
        // Fallback to opening in new tab
        window.open(fileUrl, '_blank');
    }
  }

  const handleClose = () => {
    onOpenChange(false);
  }
  
  const handleOpenInNewTab = () => {
    if (!fileUrl) return;
    window.open(fileUrl, '_blank');
  };

  const handleCopyLink = () => {
    if(!fileUrl) return;
    navigator.clipboard.writeText(fileUrl).then(() => {
        toast({
            title: "Link Copied!",
            description: "A shareable link to this file has been copied.",
        })
    }).catch(err => {
        console.error('Failed to copy: ', err);
        toast({
            variant: "destructive",
            title: "Failed to Copy",
            description: "Could not copy the link.",
        })
    });
  }

  const handleChatSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;

    let currentDocText = documentText;

    // If text hasn't been extracted yet, extract it now.
    if (!currentDocText && pdfViewerRef.current) {
      setIsExtracting(true);
      try {
        currentDocText = await pdfViewerRef.current.extractText();
        setDocumentText(currentDocText);
      } catch (err) {
        console.error("Failed to extract PDF text on demand:", err);
        toast({ variant: 'destructive', title: 'Could not read PDF', description: 'AI features are unavailable for this file.' });
        setIsExtracting(false);
        return;
      }
      setIsExtracting(false);
    }
    
    if (!currentDocText) {
       toast({ variant: 'destructive', title: 'Document Content Unavailable', description: 'Cannot chat without document content.' });
       return;
    }


    const newQuestion = chatInput;
    setChatHistory(prev => [...prev, { role: 'user', text: newQuestion }]);
    setChatInput('');
    setIsAiThinking(true);

    try {
        const answer = await chatAboutDocument({ question: newQuestion, documentContent: currentDocText });
        setChatHistory(prev => [...prev, { role: 'model', text: answer }]);
    } catch (error) {
        console.error("AI chat error:", error);
        setChatHistory(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
        setIsAiThinking(false);
    }
  }

  const isChatAvailable = item.metadata?.mime === 'application/pdf';


  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="max-w-none w-screen h-screen rounded-none p-0 flex flex-col bg-slate-900/80 backdrop-blur-sm border-0"
        hideCloseButton={true}
      >
        <DialogHeader className="hidden">
            <DialogTitle>File Preview: {item.name}</DialogTitle>
            <DialogDescription>Content of the file {item.name}.</DialogDescription>
        </DialogHeader>

        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between px-4 bg-slate-950/70 border-b border-slate-800 z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleClose} className="text-slate-300 hover:text-white hover:bg-white/10">
                <X className="w-6 h-6" />
            </Button>
            <div className='flex items-center gap-3'>
                <FileIcon className='w-5 h-5 text-slate-400' />
                <span className="font-medium text-white truncate">{item.name}</span>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            {isChatAvailable && (
              <Button variant="outline" onClick={() => setShowChat(!showChat)}>
                <MessageCircle className="mr-2 h-4 w-4"/>
                Chat
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleDownload} disabled={!fileUrl} className="text-slate-300 hover:text-white hover:bg-white/10" title="Download">
                <Download className="w-5 h-5" />
            </Button>
             <Button variant="ghost" size="icon" onClick={handleOpenInNewTab} disabled={!fileUrl} className="text-slate-300 hover:text-white hover:bg-white/10" title="Open in new tab">
                <ExternalLink className="w-5 h-5" />
            </Button>
            {isAdmin && (
             <Popover>
                <PopoverTrigger asChild>
                    <Button variant='default' className='rounded-full' disabled={!fileUrl}>
                        <Share2 className="w-5 h-5 mr-2" />
                        Share
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 border-slate-700 rounded-xl bg-slate-800 text-white shadow-lg mr-4">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">Share File</h4>
                            <p className="text-sm text-slate-400">
                                Anyone with this link can view the file.
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Input defaultValue={fileUrl} readOnly className="h-8"/>
                            <Button size="sm" className="px-3" onClick={handleCopyLink}>
                                <span className="sr-only">Copy</span>
                                <Share2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-auto flex items-center justify-center">
                {!loading && fileUrl && <FilePreview url={fileUrl} mime={item.metadata?.mime ?? 'application/octet-stream'} itemName={item.name} pdfViewerRef={pdfViewerRef} />}
                {!loading && !fileUrl && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-300 bg-slate-800/50 rounded-lg p-8">
                      <p className="text-xl mb-3">File content not available.</p>
                      <p className="text-sm text-slate-400">The file could not be loaded. It might have been deleted or there was a network issue.</p>
                  </div>
                )}
            </div>

            <AnimatePresence>
                {showChat && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 384, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="flex-shrink-0 bg-slate-900/80 border-l border-slate-800 backdrop-blur-sm flex flex-col h-full"
                    >
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-blue-400" />
                                <h3 className="font-semibold text-white">Chat with Document</h3>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowChat(false)} className="h-8 w-8">
                                <X className="w-5 h-5 text-slate-400" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                           {isExtracting && (
                                <div className="flex justify-center items-center text-slate-400 text-sm">
                                  <p>Analyzing PDF for chat...</p>
                                </div>
                            )}

                            {chatHistory.map((msg, index) => (
                                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-3 rounded-xl max-w-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                </div>
                            ))}
                            {isAiThinking && (
                                <div className="flex justify-start">
                                    <div className="p-3 rounded-xl bg-slate-700 max-w-sm w-full">
                                        <div className="space-y-2">
                                            <Skeleton className="h-3 w-4/5" />
                                            <Skeleton className="h-3 w-full" />
                                            <Skeleton className="h-3 w-3/4" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-800">
                            <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
                                <Textarea
                                    placeholder="Ask a question about the document..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    className="bg-slate-800 border-slate-700 min-h-0 h-10 max-h-32 resize-none"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleChatSubmit();
                                        }
                                    }}
                                    disabled={isExtracting}
                                />
                                <Button type="submit" size="icon" disabled={isAiThinking || !chatInput.trim() || isExtracting}>
                                    <Send className="w-5 h-5" />
                                </Button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
      </DialogContent>
    </Dialog>
  );
}
