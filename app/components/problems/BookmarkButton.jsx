'use client';

import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function BookmarkButton({ problemId, initialBookmarked }) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleBookmark = async () => {
    if (status !== 'authenticated') {
      router.push('/auth/signin');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/problems/${problemId}/bookmark`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setBookmarked(data.bookmarked);
      } else {
        // Handle error
        console.error('Failed to bookmark');
      }
    } catch (error) {
      console.error('Error bookmarking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleBookmark}
      disabled={isLoading}
      aria-label="Bookmark problem"
    >
      <Bookmark
        className={`h-5 w-5 ${
          bookmarked
            ? 'text-yellow-400 fill-current'
            : 'text-gray-400'
        }`}
      />
    </Button>
  );
} 
