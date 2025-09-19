'use client';
import { ChevronRight, Moon, Settings as SettingsIcon, User } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export function SettingsPage() {
  return (
    <div className="p-8 text-white">
      <h1 className="text-4xl font-bold mb-10">Settings</h1>
      <div className="space-y-12 max-w-2xl mx-auto">
        
        {/* Account Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Account</h2>
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between cursor-pointer hover:bg-white/5 p-4 rounded-lg transition-colors">
              <div className="flex items-center gap-4">
                <div className="bg-blue-500/10 p-3 rounded-lg">
                  <User className="text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Account Management</h3>
                  <p className="text-sm text-gray-400">Manage your account details</p>
                </div>
              </div>
              <ChevronRight className="text-gray-500" />
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Preferences</h2>
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between cursor-pointer hover:bg-white/5 p-4 rounded-lg transition-colors">
              <div className="flex items-center gap-4">
                <div className="bg-blue-500/10 p-3 rounded-lg">
                  <SettingsIcon className="text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold">App Preferences</h3>
                  <p className="text-sm text-gray-400">Customize your app experience</p>
                </div>
              </div>
              <ChevronRight className="text-gray-500" />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="bg-blue-500/10 p-3 rounded-lg">
                  <Moon className="text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Dark Mode</h3>
                  <p className="text-sm text-gray-400">Enable or disable dark mode</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default SettingsPage;
