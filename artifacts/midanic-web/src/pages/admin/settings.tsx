import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/auth-context';
import { useChangeEmail, useChangePassword } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { KeyRound, Mail, ShieldCheck } from 'lucide-react';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function AdminSettings() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const changeEmail = useChangeEmail();
  const changePassword = useChangePassword();

  const [newEmail, setNewEmail] = useState(user?.email ?? '');
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const submitEmail = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    changeEmail.mutate(
      { data: { newEmail: newEmail.trim(), currentPassword: emailPassword } },
      {
        onSuccess: (updatedUser) => {
          setUser(updatedUser);
          setEmailPassword('');
          toast.success(t('settings.email_success'));
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, t('settings.email_error')));
        },
      },
    );
  };

  const submitPassword = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.password_mismatch'));
      return;
    }
    changePassword.mutate(
      { data: { currentPassword, newPassword } },
      {
        onSuccess: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          toast.success(t('settings.password_success'));
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, t('settings.password_error')));
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{t('settings.email_title')}</CardTitle>
              <CardDescription>{t('settings.email_description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-email">{t('settings.current_email')}</Label>
              <Input id="current-email" value={user?.email ?? ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">{t('settings.new_email')}</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-password">{t('settings.current_password')}</Label>
              <Input
                id="email-password"
                type="password"
                value={emailPassword}
                onChange={(event) => setEmailPassword(event.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" disabled={changeEmail.isPending}>
              {changeEmail.isPending ? t('settings.saving') : t('settings.change_email')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-3xl">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{t('settings.password_title')}</CardTitle>
              <CardDescription>{t('settings.password_description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">{t('settings.current_password')}</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="new-password">{t('settings.new_password')}</Label>
              <Input
                id="new-password"
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">{t('settings.password_hint')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t('settings.confirm_password')}</Label>
              <Input
                id="confirm-password"
                type="password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? t('settings.saving') : t('settings.change_password')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex max-w-3xl items-start gap-3 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>{t('settings.security_note')}</p>
      </div>
    </div>
  );
}