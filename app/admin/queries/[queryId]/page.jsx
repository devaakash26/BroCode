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

export default function QueryDetailPage() {
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
      const response = await fetch(`/api/admin/queries/${queryId}`);
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
    if (status === 'authenticated') {
      if(session.user.role !== 'PLATFORM_ADMIN') {
        router.push('/dashboard');
      } else if (queryId) {
        fetchQuery();
      }
    }
  }, [status, session, queryId, router]);

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
      const response = await fetch(`/api/admin/queries/${queryId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage }),
      });
      if (!response.ok) {
        throw new Error('Failed to post reply');
      }
      setReplyMessage('');
      fetchQuery(); // Re-fetch to show new reply
      toast.success('Reply sent successfully!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsReplying(false);
    }
  };
  
  const handleResolve = async () => {
    setIsReplying(true); // Disable buttons while processing
    try {
      const response = await fetch(`/api/admin/queries/${queryId}/resolve`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error('Failed to resolve query');
      }
      fetchQuery(); // Re-fetch to update status
      toast.success('Query marked as resolved!');
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
    <div className="p-8 grid gap-8 md:grid-cols-3">
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{query.subject}</CardTitle>
                <CardDescription>
                  Conversation with {query.user.name}
                </CardDescription>
              </div>
              {getStatusBadge(query.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-[400px] overflow-y-auto p-4 border rounded-md bg-gray-50 dark:bg-gray-900 space-y-4">
              {/* Initial Query */}
              <div className="flex items-start gap-4">
                <Avatar>
                  <AvatarImage src={query.user.image} />
                  <AvatarFallback>{query.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{query.user.name}</span>
                    <span className="text-xs text-gray-500">{format(new Date(query.createdAt), 'PPpp')}</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg mt-1">{query.message}</div>
                </div>
              </div>

              {/* Replies */}
              {query.replies.map(reply => (
                <div key={reply.id} className={`flex items-start gap-4 ${reply.user.role === 'PLATFORM_ADMIN' ? 'justify-end' : ''}`}>
                   {reply.user.role !== 'PLATFORM_ADMIN' && (
                     <Avatar>
                       <AvatarImage src={reply.user.image} />
                       <AvatarFallback>{reply.user.name.charAt(0)}</AvatarFallback>
                     </Avatar>
                   )}
                  <div className={`flex-1 ${reply.user.role === 'PLATFORM_ADMIN' ? 'text-right' : ''}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{reply.user.role === 'PLATFORM_ADMIN' ? 'You' : reply.user.name}</span>
                      <span className="text-xs text-gray-500">{format(new Date(reply.createdAt), 'PPpp')}</span>
                    </div>
                    <div className={`p-3 rounded-lg mt-1 inline-block ${reply.user.role === 'PLATFORM_ADMIN' ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-gray-800'}`}>
                      {reply.message}
                    </div>
                  </div>
                  {reply.user.role === 'PLATFORM_ADMIN' && (
                     <Avatar>
                       <AvatarImage src={reply.user.image} />
                       <AvatarFallback>{session.user.name.charAt(0)}</AvatarFallback>
                     </Avatar>
                   )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {query.status !== 'RESOLVED' && (
              <div className="space-y-4">
                <Textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply here..."
                  rows={4}
                />
                <div className="flex justify-end gap-4">
                  <Button onClick={handleReply} disabled={isReplying}>
                    {isReplying ? 'Sending...' : 'Send Reply'}
                  </Button>
                  <Button onClick={handleResolve} disabled={isReplying} variant="outline">
                    Mark as Resolved
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={query.user.image} />
                <AvatarFallback>{query.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-bold">{query.user.name}</div>
                <div>{query.user.email}</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold">Status</h4>
              {getStatusBadge(query.status)}
            </div>
            <div>
              <h4 className="font-semibold">Submitted</h4>
              <p>{format(new Date(query.createdAt), 'PPpp')}</p>
            </div>
            <div>
              <h4 className="font-semibold">Last Updated</h4>
              <p>{format(new Date(query.updatedAt), 'PPpp')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 