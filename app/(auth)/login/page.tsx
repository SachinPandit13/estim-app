'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Authentication failed. Please verify your credentials.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-atmosphere flex min-h-screen flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[26rem]">
        <div className="rounded-[1.25rem] border border-border bg-surface p-7 sm:p-8 shadow-[var(--shadow-float)] transition-all">
          <header className="mb-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-[12px] bg-brand text-brand-foreground shadow-sm">
              <ShieldCheck className="size-7" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground font-heading">
              ESTIM MONITORING
            </h1>
            <p className="mt-1 text-micro font-mono uppercase tracking-widest text-brand font-medium">
              Industrial Worker Safety Console
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-[10px] border border-danger/30 bg-danger-muted p-3 text-xs text-danger">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="supervisor@facility.internal"
                  required
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="pl-9"
                />
              </div>
            </div>

            <Button
              type="submit"
              loading={loading}
              loadingText="Authenticating..."
              variant="default"
              className="w-full mt-2 h-10 gap-2 font-semibold"
            >
              Sign In to Safety Console
              <ArrowRight className="size-4" />
            </Button>

            <div className="pt-2 text-center text-micro text-muted font-mono">
              Authorized personnel only • All access is audited
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
