
import { Logo } from '@/components/logo';

export default function AuthCallbackLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
             <div className="absolute top-0 left-0 -translate-x-1/3 -translate-y-1/3 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl opacity-50"></div>
             <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-96 h-96 bg-green-500/20 rounded-full blur-3xl opacity-50"></div>
            <div className="flex flex-col items-center gap-4 text-center">
                <Logo className="h-16 w-16 animate-pulse" />
                {children}
            </div>
        </div>
    );
}
