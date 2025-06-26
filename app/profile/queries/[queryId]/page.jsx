'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function UserQueryDetailPage() {
  const [query, setQuery] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const router = useRouter();
  const params = useParams();
  const { queryId } = params;
  const { data: session, status } = useSession();
  const messagesEndRef = useRef(null);

  const fetchQuery = async () => {
    try {
      const response = await fetch(`/api/user/queries/${queryId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch query details');
      }
      const data = await response.json();
      setQuery(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
        router.push('/auth/signin');
    } else if (status === 'authenticated' && queryId) {
      fetchQuery();
    }
  }, [status, queryId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [query]);

  const handleReply = async () => {
    if (!replyMessage.trim()) {
      toast.error('Reply message cannot be empty.');
      return;
    }
    setIsReplying(true);
    try {
      const response = await fetch(`/api/user/queries/${queryId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage }),
      });
      if (!response.ok) {
        throw new Error('Failed to post reply');
      }
      setReplyMessage('');
      fetchQuery();
      toast.success('Your reply has been sent!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsReplying(false);
    }
  };
  
  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-[500px] w-full" /></div>;
  }
  
  if (!query) {
    return <div className="p-8 text-center">Query not found.</div>;
  }

  const getStatusBadge = (status) => {
    switch (status) {
        case 'OPEN':
          return <Badge variant="destructive">Open</Badge>;
        case 'IN_PROGRESS':
          return <Badge className="bg-yellow-500">In Progress</Badge>;
        case 'RESOLVED':
          return <Badge className="bg-green-500">Resolved</Badge>;
        default:
          return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4">
        <Link href="/profile/queries" className="text-sm text-indigo-600 hover:underline">
            &larr; Back to My Queries
        </Link>
      </div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{query.subject}</CardTitle>
              <CardDescription>
                Submitted on {format(new Date(query.createdAt), 'PP')}
              </CardDescription>
            </div>
            {getStatusBadge(query.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="h-[400px] overflow-y-auto p-4 border rounded-md bg-gray-50 dark:bg-gray-900 space-y-4">
            {/* Initial Query Message */}
            <div className="flex items-start gap-4 justify-end">
                <div className="flex-1 text-right">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">You</span>
                    <span className="text-xs text-gray-500">{format(new Date(query.createdAt), 'PPpp')}</span>
                  </div>
                  <div className="p-3 rounded-lg mt-1 inline-block bg-indigo-500 text-white">
                    {query.message}
                  </div>
                </div>
                <Avatar>
                    <AvatarImage src={session.user.image} />
                    <AvatarFallback>{session.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
            </div>
            
            {query.replies.map(reply => (
              <div key={reply.id} className={`flex items-start gap-4 ${reply.userId === session.user.id ? 'justify-end' : ''}`}>
                 {reply.userId !== session.user.id && (
                   <Avatar>
                     <AvatarImage src={reply.user.image} />
                     <AvatarFallback>{reply.user.name.charAt(0)}</AvatarFallback>
                   </Avatar>
                 )}
                <div className={`flex-1 ${reply.userId === session.user.id ? 'text-right' : ''}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{reply.userId === session.user.id ? 'You' : 'Admin'}</span>
                    <span className="text-xs text-gray-500">{format(new Date(reply.createdAt), 'PPpp')}</span>
                  </div>
                  <div className={`p-3 rounded-lg mt-1 inline-block ${reply.userId === session.user.id ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-gray-800'}`}>
                    {reply.message}
                  </div>
                </div>
                {reply.userId === session.user.id && (
                   <Avatar>
                     <AvatarImage src={session.user.image} />
                     <AvatarFallback>{session.user.name.charAt(0)}</AvatarFallback>
                   </Avatar>
                 )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="space-y-4">
            <Textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder={query.status === 'RESOLVED' ? "Type here to reopen this query..." : "Type your reply here..."}
              rows={4}
            />
            <div className="flex justify-end gap-4">
              <Button onClick={handleReply} disabled={isReplying}>
                {isReplying ? 'Sending...' : (query.status === 'RESOLVED' ? 'Reopen and Reply' : 'Send Reply')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 