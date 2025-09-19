'use client';
import { ChevronRight, Moon, Settings as SettingsIcon, User } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>
      <div className="space-y-10">
        
        <section className="glass-card">
          <h2 className="text-lg font-bold text-white mb-4">Account</h2>
          <div className="flex flex-col">
            <a href="#" className="flex items-center justify-between rounded-lg p-4 transition-colors hover:bg-white/10">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <User />
                </div>
                <div>
                  <p className="font-medium text-white">Account Management</p>
                  <p className="text-sm text-slate-400">Manage your account details</p>
                </div>
              </div>
              <ChevronRight className="text-slate-500" />
            </a>
          </div>
        </section>

        <section className="glass-card">
          <h2 className="text-lg font-bold text-white mb-4">Preferences</h2>
          <div className="flex flex-col space-y-2">
            <a href="#" className="flex items-center justify-between rounded-lg p-4 transition-colors hover:bg-white/10">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <SettingsIcon />
                </div>
                <div>
                  <p className="font-medium text-white">App Preferences</p>
                  <p className="text-sm text-slate-400">Customize your app experience</p>
                </div>
              </div>
              <ChevronRight className="text-slate-500" />
            </a>
            <div className="flex items-center justify-between rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Moon />
                </div>
                <div>
                  <p className="font-medium text-white">Dark Mode</p>
                  <p className="text-sm text-slate-400">Enable or disable dark mode</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

export default SettingsPage;
