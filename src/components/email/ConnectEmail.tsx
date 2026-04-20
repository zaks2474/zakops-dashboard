/**
 * ConnectEmail Component (Phase 16.6)
 *
 * OAuth-based email connection for Gmail and Outlook.
 * Integrates with the Phase 22 email API endpoints.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  IconMail,
  IconCheck,
  IconLoader2,
  IconBrandGmail,
  IconBrandOffice,
  IconAlertCircle,
  IconTrash,
  IconRefresh,
  IconExternalLink,
  IconShieldCheck,
  IconX,
} from '@tabler/icons-react';

// =============================================================================
// Types
// =============================================================================

export interface EmailAccount {
  id: string;
  provider: 'gmail' | 'outlook';
  email_address: string;
  is_primary: boolean;
  connected_at: string;
  last_sync_at?: string;
  status: 'active' | 'needs_reauth' | 'disabled';
}

export interface ConnectEmailProps {
  /** Current connected accounts */
  accounts?: EmailAccount[];
  /** Loading state */
  isLoading?: boolean;
  /** Callback when account is connected */
  onAccountConnected?: (account: EmailAccount) => void;
  /** Callback when account is disconnected */
  onAccountDisconnected?: (accountId: string) => void;
  /** Callback to refresh accounts */
  onRefresh?: () => void;
  /** Show as card or inline */
  variant?: 'card' | 'inline';
  /** Allow multiple accounts */
  allowMultiple?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9200';

async function getOAuthUrl(provider: 'gmail' | 'outlook'): Promise<string> {
  const response = await fetch(`${API_BASE}/api/integrations/email/${provider}/auth`);
  if (!response.ok) {
    throw new Error('Failed to get OAuth URL');
  }
  const data = await response.json();
  return data.auth_url;
}

async function disconnectAccount(accountId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/integrations/email/accounts/${accountId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to disconnect account');
  }
}

// =============================================================================
// Provider Button Component
// =============================================================================

interface ProviderButtonProps {
  provider: 'gmail' | 'outlook';
  isConnecting: boolean;
  selectedProvider: 'gmail' | 'outlook' | null;
  disabled: boolean;
  onClick: () => void;
}

function ProviderButton({
  provider,
  isConnecting,
  selectedProvider,
  disabled,
  onClick,
}: ProviderButtonProps) {
  const isSelected = selectedProvider === provider && isConnecting;

  const icons = {
    gmail: <IconBrandGmail className="w-8 h-8 text-red-500" />,
    outlook: <IconBrandOffice className="w-8 h-8 text-blue-500" />,
  };

  const labels = {
    gmail: 'Google Workspace',
    outlook: 'Microsoft 365',
  };

  return (
    <Button
      variant="outline"
      className="h-24 flex-col gap-2"
      onClick={onClick}
      disabled={disabled || isConnecting}
    >
      {isSelected ? (
        <IconLoader2 className="w-8 h-8 animate-spin" />
      ) : (
        icons[provider]
      )}
      <span>{labels[provider]}</span>
    </Button>
  );
}

// =============================================================================
// Account Card Component
// =============================================================================

interface AccountCardProps {
  account: EmailAccount;
  onDisconnect: () => void;
  isDisconnecting: boolean;
}

function AccountCard({ account, onDisconnect, isDisconnecting }: AccountCardProps) {
  const statusColors = {
    active: 'text-green-600 bg-green-50',
    needs_reauth: 'text-amber-600 bg-amber-50',
    disabled: 'text-gray-600 bg-gray-50',
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        {account.provider === 'gmail' ? (
          <IconBrandGmail className="w-6 h-6 text-red-500" />
        ) : (
          <IconBrandOffice className="w-6 h-6 text-blue-500" />
        )}
        <div>
          <p className="font-medium text-sm">{account.email_address}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className={`text-xs ${statusColors[account.status]}`}>
              {account.status === 'active' ? (
                <>
                  <IconCheck className="w-3 h-3 mr-1" />
                  Connected
                </>
              ) : account.status === 'needs_reauth' ? (
                <>
                  <IconAlertCircle className="w-3 h-3 mr-1" />
                  Re-auth needed
                </>
              ) : (
                'Disabled'
              )}
            </Badge>
            {account.is_primary && (
              <Badge variant="secondary" className="text-xs">Primary</Badge>
            )}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDisconnect}
        disabled={isDisconnecting}
        className="text-destructive hover:text-destructive"
      >
        {isDisconnecting ? (
          <IconLoader2 className="w-4 h-4 animate-spin" />
        ) : (
          <IconTrash className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ConnectEmail({
  accounts = [],
  isLoading = false,
  onAccountConnected,
  onAccountDisconnected,
  onRefresh,
  variant = 'card',
  allowMultiple = false,
}: ConnectEmailProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'gmail' | 'outlook' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [showOAuthDialog, setShowOAuthDialog] = useState(false);
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);

  const hasConnectedAccount = accounts.length > 0;
  const canConnectMore = allowMultiple || !hasConnectedAccount;

  // Handle OAuth connection
  const handleConnect = useCallback(async (provider: 'gmail' | 'outlook') => {
    setSelectedProvider(provider);
    setIsConnecting(true);
    setError(null);

    try {
      const authUrl = await getOAuthUrl(provider);
      setOauthUrl(authUrl);
      setShowOAuthDialog(true);

      // Open OAuth in new window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'EmailOAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Poll for popup close and check for success
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setShowOAuthDialog(false);
          setIsConnecting(false);
          // Trigger refresh to check for new account
          onRefresh?.();
        }
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start OAuth flow');
      setIsConnecting(false);
      setSelectedProvider(null);
    }
  }, [onRefresh]);

  // Handle disconnect
  const handleDisconnect = useCallback(async (accountId: string) => {
    setDisconnectingId(accountId);
    try {
      await disconnectAccount(accountId);
      onAccountDisconnected?.(accountId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect account');
    } finally {
      setDisconnectingId(null);
    }
  }, [onAccountDisconnected]);

  // Content
  const content = (
    <div className="space-y-4">
      {/* Connected accounts */}
      {accounts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Connected Accounts</p>
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                <IconRefresh className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onDisconnect={() => handleDisconnect(account.id)}
                isDisconnecting={disconnectingId === account.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add account section */}
      {canConnectMore && (
        <>
          {accounts.length > 0 && <Separator />}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              {hasConnectedAccount
                ? 'Connect another email account'
                : 'Connect your email to enable automatic deal triage'}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <ProviderButton
                provider="gmail"
                isConnecting={isConnecting}
                selectedProvider={selectedProvider}
                disabled={!canConnectMore}
                onClick={() => handleConnect('gmail')}
              />
              <ProviderButton
                provider="outlook"
                isConnecting={isConnecting}
                selectedProvider={selectedProvider}
                disabled={!canConnectMore}
                onClick={() => handleConnect('outlook')}
              />
            </div>
          </div>
        </>
      )}

      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <IconAlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Permissions info */}
      <Alert variant="default" className="bg-muted/50">
        <IconShieldCheck className="h-4 w-4" />
        <AlertTitle>Secure Connection</AlertTitle>
        <AlertDescription className="text-xs">
          We use OAuth 2.0 for secure access. Your password is never shared with us.
          You can revoke access at any time from your account settings.
        </AlertDescription>
      </Alert>
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // Render as card or inline
  if (variant === 'card') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconMail className="h-5 w-5" />
            Email Integration
          </CardTitle>
          <CardDescription>
            Connect your email to enable automatic deal triage and communication tracking
          </CardDescription>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return content;
}

// =============================================================================
// OAuth Dialog
// =============================================================================

interface OAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: 'gmail' | 'outlook' | null;
  authUrl: string | null;
}

export function OAuthDialog({ open, onOpenChange, provider, authUrl }: OAuthDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {provider === 'gmail' ? (
              <IconBrandGmail className="h-5 w-5 text-red-500" />
            ) : (
              <IconBrandOffice className="h-5 w-5 text-blue-500" />
            )}
            Connecting to {provider === 'gmail' ? 'Google' : 'Microsoft'}
          </DialogTitle>
          <DialogDescription>
            Complete the authorization in the popup window
          </DialogDescription>
        </DialogHeader>

        <div className="py-8 text-center">
          <IconLoader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">
            A popup window should have opened. If not, click below:
          </p>
          {authUrl && (
            <Button
              variant="link"
              className="mt-2"
              onClick={() => window.open(authUrl, '_blank')}
            >
              <IconExternalLink className="h-4 w-4 mr-2" />
              Open Authorization Page
            </Button>
          )}
        </div>

        <div className="flex justify-center">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ConnectEmail;
