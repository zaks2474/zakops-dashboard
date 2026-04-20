/**
 * AskAgent Component (Phase 16.6)
 *
 * Provides a quick way to ask the agent questions about a deal.
 * Integrates with the existing chat system.
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { IconMessage, IconRobot, IconSend, IconSparkles } from '@tabler/icons-react';

// =============================================================================
// Types
// =============================================================================

export interface AskAgentProps {
  /** Deal ID to scope the question */
  dealId: string;
  /** Deal name for context */
  dealName?: string;
  /** Custom trigger element */
  trigger?: React.ReactNode;
  /** Callback when question is submitted */
  onSubmit?: (question: string) => void;
  /** Additional class name for the trigger */
  className?: string;
}

// Quick question templates
const QUICK_QUESTIONS = [
  { label: 'Summarize', question: 'Give me a summary of this deal and its current status.' },
  { label: 'Key risks', question: 'What are the key risks and concerns with this deal?' },
  { label: 'Next steps', question: 'What should be the next steps for this deal?' },
  { label: 'Compare', question: 'How does this deal compare to similar deals we have seen?' },
];

// =============================================================================
// Component
// =============================================================================

export function AskAgent({
  dealId,
  dealName,
  trigger,
  onSubmit,
  className,
}: AskAgentProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!question.trim()) return;

    setIsSubmitting(true);
    try {
      // Call optional callback
      onSubmit?.(question);

      // Navigate to chat with the question pre-filled
      const params = new URLSearchParams({
        deal_id: dealId,
        q: question.trim(),
      });
      router.push(`/chat?${params.toString()}`);
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [question, dealId, router, onSubmit]);

  const handleQuickQuestion = useCallback((q: string) => {
    setQuestion(q);
  }, []);

  const defaultTrigger = (
    <Button variant="outline" size="sm" className={className}>
      <IconRobot className="mr-2 h-4 w-4" />
      Ask Agent
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconSparkles className="h-5 w-5 text-primary" />
            Ask the Agent
          </DialogTitle>
          <DialogDescription>
            Ask a question about{' '}
            {dealName ? (
              <span className="font-medium">{dealName}</span>
            ) : (
              'this deal'
            )}
            . The agent will analyze available information and provide insights.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick questions */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTIONS.map((q) => (
                <Badge
                  key={q.label}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handleQuickQuestion(q.question)}
                >
                  {q.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Question input */}
          <div className="space-y-2">
            <Textarea
              placeholder="Ask a question about this deal..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) {
                  handleSubmit();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Press ⌘+Enter to submit
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!question.trim() || isSubmitting}
          >
            <IconSend className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Opening chat...' : 'Ask in Chat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Inline Ask Component (for embedding in cards)
// =============================================================================

export interface InlineAskAgentProps {
  dealId: string;
  dealName?: string;
  placeholder?: string;
  className?: string;
}

export function InlineAskAgent({
  dealId,
  dealName,
  placeholder = 'Ask about this deal...',
  className,
}: InlineAskAgentProps) {
  const router = useRouter();
  const [question, setQuestion] = useState('');

  const handleSubmit = useCallback(() => {
    if (!question.trim()) return;

    const params = new URLSearchParams({
      deal_id: dealId,
      q: question.trim(),
    });
    router.push(`/chat?${params.toString()}`);
  }, [question, dealId, router]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex-1">
        <IconMessage className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={placeholder}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit();
            }
          }}
          className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <Button size="sm" onClick={handleSubmit} disabled={!question.trim()}>
        <IconSend className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default AskAgent;
