'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Copy, CheckCircle2, Share2, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

export default function InviteMembersDialog({ group, className }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailText, setEmailText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inviteData, setInviteData] = useState({
    inviteLink: group?.inviteLink || null,
    inviteCode: group?.inviteCode || null
  });

  // Fetch invite link and code when dialog opens if not available
  useEffect(() => {
    if (open && (!inviteData.inviteLink || !inviteData.inviteCode)) {
      fetchInviteData();
    }
  }, [open]);

  const fetchInviteData = async () => {
    if (!group?.id) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/groups/${group.id}/invites`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch invite information');
      }
      
      const data = await response.json();
      setInviteData({
        inviteLink: data.inviteLink,
        inviteCode: data.inviteCode
      });
    } catch (error) {
      console.error('Error fetching invite data:', error);
      toast.error('Unable to load invite information');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshInviteCode = async () => {
    if (!group?.id) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/groups/${group.id}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh invite code');
      }
      
      const data = await response.json();
      setInviteData({
        inviteLink: data.inviteLink,
        inviteCode: data.inviteCode
      });
      toast.success('Invite code refreshed successfully');
    } catch (error) {
      console.error('Error refreshing invite code:', error);
      toast.error('Unable to refresh invite code');
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteLink = async () => {
    if (!inviteData.inviteLink) {
      toast.error('Invite link not available');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(inviteData.inviteLink);
      setCopied(true);
      toast.success('Invite link copied to clipboard!');
      
      setTimeout(() => {
        setCopied(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to copy invite link:', error);
      toast.error('Failed to copy invite link');
    }
  };

  const copyInviteCode = async () => {
    if (!inviteData.inviteCode) {
      toast.error('Invite code not available');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(inviteData.inviteCode);
      toast.success('Invite code copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy invite code:', error);
      toast.error('Failed to copy invite code');
    }
  };

  const shareInvite = async () => {
    if (!inviteData.inviteLink) {
      toast.error('Invite link not available');
      return;
    }
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Join ${group.name} on BroCode`,
          text: `I'm inviting you to join ${group.name} on BroCode!`,
          url: inviteData.inviteLink,
        }).catch(err => {
          console.error('Error sharing:', err);
          if (err.name !== 'AbortError') {
            toast.error('Failed to share invite link');
          }
        });
        toast.success('Shared successfully!');
      } else {
        await copyInviteLink();
      }
    } catch (error) {
      console.error('Error sharing:', error);
      if (error.name !== 'AbortError') {
        toast.error('Failed to share invite link');
      }
    }
  };

  const sendEmailInvite = () => {
    if (!emailText.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    
    if (!inviteData.inviteLink) {
      toast.error('Invite link not available');
      return;
    }

    const emailSubject = `Join ${group.name} on BroCode`;
    const emailBody = `Hello,\n\nI'm inviting you to join our coding group "${group.name}" on BroCode!\n\nJoin using this invite code: ${inviteData.inviteCode}\n\nOr use this link: ${inviteData.inviteLink}\n\nSee you there!`;
    
    window.location.href = `mailto:${emailText}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    toast.success('Email client opened');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={className ? undefined : "outline"} 
          size="sm" 
          className={className || "flex items-center gap-2"}
        >
          <UserPlus className="h-4 w-4" />
          <span>Invite Members</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Members</DialogTitle>
          <DialogDescription>
            Invite others to join "{group?.name}" by sharing the invite link or code.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 py-4">
          <div className="flex flex-col space-y-2">
            <div className="text-sm font-medium">Invite Link</div>
            <div className="flex items-center space-x-2">
              <Input 
                readOnly 
                value={isLoading ? 'Loading invite link...' : inviteData.inviteLink || 'No invite link available'}
                className="flex-1 text-sm font-mono"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={copyInviteLink}
                disabled={isLoading || !inviteData.inviteLink}
                className="flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col space-y-2">
            <div className="text-sm font-medium">Invite Code</div>
            <div className="flex items-center space-x-2">
              <Input 
                readOnly 
                value={isLoading ? 'Loading...' : inviteData.inviteCode || 'No invite code available'}
                className="flex-1 text-sm font-mono"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={copyInviteCode}
                disabled={isLoading || !inviteData.inviteCode}
                className="flex items-center gap-1.5"
              >
                <Copy className="h-4 w-4" />
                <span>Copy</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={refreshInviteCode}
                disabled={isLoading}
                className="flex items-center gap-1.5"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex flex-col space-y-2">
            <div className="text-sm font-medium">Invite by Email</div>
            <div className="flex items-center space-x-2">
              <Input
                type="email"
                placeholder="someone@example.com"
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={sendEmailInvite}
                disabled={isLoading || !inviteData.inviteLink}
                className="flex items-center gap-1.5"
              >
                <Mail className="h-4 w-4" />
                <span>Send</span>
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row sm:space-x-2">
          <Button
            variant="outline"
            onClick={shareInvite}
            disabled={isLoading || !inviteData.inviteLink}
            className="sm:w-auto w-full flex items-center gap-1.5 mb-2 sm:mb-0"
          >
            <Share2 className="h-4 w-4" />
            <span>Share Invite</span>
          </Button>
          <Button
            onClick={() => setOpen(false)}
            className="sm:w-auto w-full"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
