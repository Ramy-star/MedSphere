'use client';
import { useMemo } from 'react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useAuthStore } from '@/stores/auth-store';
import { Channel } from '@/docs/backend.json';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

const ChannelCard = ({ channel }: { channel: Channel }) => {
  const memberCount = Array.isArray(channel.members) ? channel.members.length : 0;
  return (
    <motion.div 
      className="glass-card p-5 rounded-xl flex flex-col justify-between"
      whileHover={{ y: -5, transition: { type: 'spring', stiffness: 300 } }}
    >
      <div>
        <h3 className="text-lg font-bold text-white">{channel.name}</h3>
        <p className="text-sm text-slate-400 mt-1 h-10 line-clamp-2">{channel.description}</p>
      </div>
      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center text-xs text-slate-500 gap-2">
          <Users className="w-4 h-4" />
          <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
        </div>
        <Button size="sm" className="rounded-full bg-blue-600 hover:bg-blue-700 h-8 text-xs">View</Button>
      </div>
    </motion.div>
  );
};

export default function ChannelsPage({ params }: { params: { category: string } }) {
  const { category } = params;
  const { user } = useAuthStore();
  const router = useRouter();

  const queryOptions = useMemo(() => {
    if (category === 'level') {
      return { where: ['levelId', '==', user?.level] };
    }
    if (category === 'private') {
      return { where: ['members', 'array-contains', user?.uid] };
    }
    // For 'public'
    return { where: ['type', '==', 'public'] };
  }, [category, user]);

  const { data: channels, loading } = useCollection<Channel>('channels', queryOptions);

  const categoryTitles: { [key: string]: string } = {
    public: 'Public Channels',
    level: `Your Level (${user?.level || 'N/A'})`,
    private: 'Private & Study Groups',
  };

  const title = categoryTitles[category] || 'Channels';

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => router.push('/community')}>
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
                {title}
            </h1>
        </div>
        <Button className="rounded-full">
          <PlusCircle className="mr-2 h-4 w-4"/>
          Create Group
        </Button>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card p-5 rounded-xl h-[150px] animate-pulse" />
          ))}
        </div>
      ) : channels && channels.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto flex-1 pb-4">
          {channels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center">
            <div className="text-slate-500">
                <p className="text-lg font-medium">No channels found in this category.</p>
                <p className="text-sm">Why not be the first to create one?</p>
            </div>
        </div>
      )}
    </div>
  );
}
