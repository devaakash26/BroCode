'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { PenTool } from 'lucide-react';
import useSocket from '@/app/hooks/useSocket';

/** Shows a "join playground" toast anywhere in the app when someone invites you. */
export default function PlaygroundInviteListener() {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected || status !== 'authenticated') return;
    const onInvite = ({ roomId, title, from }) => {
      if (pathname === `/playground/${roomId}`) return;
      toast.custom(
        (t) => (
          <div
            className={`w-80 flex gap-3 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 shadow-xl ${
              t.visible ? 'animate-in fade-in slide-in-from-top-2' : 'opacity-0'
            }`}
          >
            <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
              <PenTool className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {from?.name || 'Someone'} invited you
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">to “{title}” · live playground</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    router.push(`/playground/${roomId}`);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  Join now
                </button>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ),
        { id: `pg-invite-${roomId}`, duration: 30_000, position: 'top-right' },
      );
    };
    socket.on('pg:invited', onInvite);
    return () => socket.off('pg:invited', onInvite);
  }, [socket, isConnected, status, pathname, router]);

  return null;
}
