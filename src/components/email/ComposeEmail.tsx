/**
 * ComposeEmail Component (Phase 16.6)
 *
 * Component for composing and sending emails within the dashboard.
 * Integrates with the Phase 22 email API.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  IconSend,
  IconLoader2,
  IconPaperclip,
  IconX,
  IconPlus,
  IconCheck,
  IconAlertCircle,
  IconMail,
  IconTemplate,
} from '@tabler/icons-react';

// =============================================================================
// Types
// =============================================================================

export interface EmailAccount {
  id: string;
  email_address: string;
  provider: 'gmail' | 'outlook';
}

export interface EmailDraft {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: File[];
  thread_id?: string;
  in_reply_to?: string;
}

export interface ComposeEmailProps {
  /** Available email accounts to send from */
  accounts: EmailAccount[];
  /** Deal ID to associate email with */
  dealId?: string;
  /** Thread ID if replying */
  threadId?: string;
  /** Message ID if replying */
  inReplyTo?: string;
  /** Pre-fill recipient */
  defaultTo?: string[];
  /** Pre-fill subject */
  defaultSubject?: string;
  /** Pre-fill body */
  defaultBody?: string;
  /** Custom trigger element */
  trigger?: React.ReactNode;
  /** Callback on successful send */
  onSent?: (messageId: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

// Email templates
const EMAIL_TEMPLATES = [
  {
    id: 'follow-up',
    name: 'Follow Up',
    subject: 'Following up on [Deal Name]',
    body: `Hi [Name],

I wanted to follow up on our recent conversation regarding [Deal Name].

[Your message here]

Best regards`,
  },
  {
    id: 'nda-request',
    name: 'NDA Request',
    subject: 'NDA Request - [Deal Name]',
    body: `Hi [Name],

Thank you for sending over the information on [Deal Name]. Before we proceed further, we would need to have an NDA in place.

Could you please send over your standard mutual NDA for review?

Best regards`,
  },
  {
    id: 'cim-request',
    name: 'CIM Request',
    subject: 'CIM Request - [Deal Name]',
    body: `Hi [Name],

Thank you for the introduction to [Deal Name]. We're interested in learning more about this opportunity.

Could you please share the Confidential Information Memorandum (CIM) when available?

Best regards`,
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9200';

async function sendEmail(
  accountId: string,
  draft: EmailDraft,
  dealId?: string
): Promise<{ message_id: string }> {
  const response = await fetch(`${API_BASE}/api/integrations/email/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      account_id: accountId,
      to: draft.to,
      cc: draft.cc,
      bcc: draft.bcc,
      subject: draft.subject,
      body: draft.body,
      thread_id: draft.thread_id,
      in_reply_to: draft.in_reply_to,
      deal_id: dealId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to send email' }));
    throw new Error(error.detail || 'Failed to send email');
  }

  return response.json();
}

// =============================================================================
// Recipient Input Component
// =============================================================================

interface RecipientInputProps {
  label: string;
  recipients: string[];
  onChange: (recipients: string[]) => void;
  placeholder?: string;
}

function RecipientInput({ label, recipients, onChange, placeholder }: RecipientInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addRecipient = useCallback(() => {
    const email = inputValue.trim();
    if (email && !recipients.includes(email)) {
      onChange([...recipients, email]);
      setInputValue('');
    }
  }, [inputValue, recipients, onChange]);

  const removeRecipient = useCallback((email: string) => {
    onChange(recipients.filter((r) => r !== email));
  }, [recipients, onChange]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
        {recipients.map((email) => (
          <Badge key={email} variant="secondary" className="gap-1">
            {email}
            <button
              type="button"
              onClick={() => removeRecipient(email)}
              className="ml-1 hover:text-destructive"
            >
              <IconX className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          type="email"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addRecipient();
            }
          }}
          onBlur={addRecipient}
          placeholder={recipients.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[150px] bg-transparent border-none outline-none text-sm"
        />
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ComposeEmail({
  accounts,
  dealId,
  threadId,
  inReplyTo,
  defaultTo = [],
  defaultSubject = '',
  defaultBody = '',
  trigger,
  onSent,
  onError,
}: ComposeEmailProps) {
  const [open, setOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [to, setTo] = useState<string[]>(defaultTo);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setTo(defaultTo);
      setSubject(defaultSubject);
      setBody(defaultBody);
      setError(null);
      setSuccess(false);
    }
  }, [open, defaultTo, defaultSubject, defaultBody]);

  // Apply template
  const applyTemplate = useCallback((templateId: string) => {
    const template = EMAIL_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  }, []);

  // Send email
  const handleSend = useCallback(async () => {
    if (to.length === 0) {
      setError('Please add at least one recipient');
      return;
    }
    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }
    if (!selectedAccountId) {
      setError('Please select an account to send from');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const result = await sendEmail(
        selectedAccountId,
        {
          to,
          cc: cc.length > 0 ? cc : undefined,
          bcc: bcc.length > 0 ? bcc : undefined,
          subject,
          body,
          thread_id: threadId,
          in_reply_to: inReplyTo,
        },
        dealId
      );

      setSuccess(true);
      onSent?.(result.message_id);

      // Close dialog after short delay
      setTimeout(() => {
        setOpen(false);
      }, 1500);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send email');
      setError(error.message);
      onError?.(error);
    } finally {
      setIsSending(false);
    }
  }, [to, cc, bcc, subject, body, selectedAccountId, threadId, inReplyTo, dealId, onSent, onError]);

  // No accounts connected
  if (accounts.length === 0) {
    return (
      <Alert>
        <IconAlertCircle className="h-4 w-4" />
        <AlertDescription>
          Connect an email account to send emails
        </AlertDescription>
      </Alert>
    );
  }

  const defaultTrigger = (
    <Button>
      <IconMail className="mr-2 h-4 w-4" />
      Compose Email
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
          <DialogDescription>
            {dealId ? 'Send an email related to this deal' : 'Compose a new email'}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconCheck className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-medium">Email Sent!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your email has been sent successfully
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* From account selector */}
            <div className="space-y-2">
              <Label>From</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.email_address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* To */}
            <RecipientInput
              label="To"
              recipients={to}
              onChange={setTo}
              placeholder="Enter recipient email"
            />

            {/* CC/BCC toggle */}
            {!showCcBcc && (
              <Button
                variant="link"
                size="sm"
                className="text-muted-foreground p-0 h-auto"
                onClick={() => setShowCcBcc(true)}
              >
                <IconPlus className="h-3 w-3 mr-1" />
                Add Cc/Bcc
              </Button>
            )}

            {/* CC */}
            {showCcBcc && (
              <>
                <RecipientInput
                  label="Cc"
                  recipients={cc}
                  onChange={setCc}
                  placeholder="Enter Cc recipients"
                />
                <RecipientInput
                  label="Bcc"
                  recipients={bcc}
                  onChange={setBcc}
                  placeholder="Enter Bcc recipients"
                />
              </>
            )}

            <Separator />

            {/* Subject */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Subject</Label>
                <Select onValueChange={applyTemplate}>
                  <SelectTrigger className="w-auto h-7 text-xs">
                    <IconTemplate className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Use template" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_TEMPLATES.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject"
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                rows={10}
                className="resize-none font-mono text-sm"
              />
            </div>

            {/* Error display */}
            {error && (
              <Alert variant="destructive">
                <IconAlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {!success && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={isSending || to.length === 0}>
              {isSending ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <IconSend className="mr-2 h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Quick Reply Component
// =============================================================================

export interface QuickReplyProps {
  accountId: string;
  threadId: string;
  inReplyTo: string;
  dealId?: string;
  onSent?: (messageId: string) => void;
}

export function QuickReply({ accountId, threadId, inReplyTo, dealId, onSent }: QuickReplyProps) {
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = useCallback(async () => {
    if (!body.trim()) return;

    setIsSending(true);
    setError(null);

    try {
      const result = await sendEmail(
        accountId,
        {
          to: [], // Reply uses thread context
          subject: '', // Reply uses thread subject
          body,
          thread_id: threadId,
          in_reply_to: inReplyTo,
        },
        dealId
      );

      setBody('');
      onSent?.(result.message_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setIsSending(false);
    }
  }, [body, accountId, threadId, inReplyTo, dealId, onSent]);

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply..."
        rows={4}
        className="resize-none"
      />
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <div className="flex justify-end">
        <Button size="sm" onClick={handleSend} disabled={isSending || !body.trim()}>
          {isSending ? (
            <IconLoader2 className="h-4 w-4 animate-spin" />
          ) : (
            <IconSend className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

export default ComposeEmail;
