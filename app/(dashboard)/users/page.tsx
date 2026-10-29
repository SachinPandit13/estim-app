'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { usePolling } from '@/hooks/use-polling';
import { StatusBadge } from '@/components/shared/status-badge';
import { DataTableToolbar } from '@/components/shared/data-table-toolbar';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Users, Plus, Shield, Mail } from 'lucide-react';
import type { User, UserCreateInput } from '@/types/api';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [_loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<UserCreateInput>({
    email: '',
    full_name: '',
    role: 'member',
    password: '',
    is_active: true,
  });

  const fetchUsers = async () => {
    try {
      const data = await apiClient<User[]>('/users');
      setUsers(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  usePolling(fetchUsers, { intervalMs: 20000 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) return;
    setSubmitting(true);
    try {
      await apiClient<User>('/users', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setIsDialogOpen(false);
      setFormData({
        email: '',
        full_name: '',
        role: 'member',
        password: '',
        is_active: true,
      });
      await fetchUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(term) ||
      (u.full_name && u.full_name.toLowerCase().includes(term)) ||
      u.role.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border">
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Users & Operator Access Control
          </h2>
          <p className="text-xs text-muted-foreground font-mono">
            Manage authenticated safety operators, supervisors, and administrative credentials
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          className="h-8 gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
        >
          <Plus className="size-3.5" />
          Add Operator
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Register Facility Operator</DialogTitle>
              <DialogDescription className="text-xs">
                Grant safety console access to supervisors and safety team members.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-3 py-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Email Address *</label>
                <Input
                  type="email"
                  required
                  placeholder="operator@facility.internal"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Full Name</label>
                <Input
                  placeholder="e.g. Marcus Vance"
                  value={formData.full_name || ''}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground outline-hidden font-mono"
                  >
                    <option value="member">Member</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Initial Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDialogOpen(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  size="sm"
                  className="h-8 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
                >
                  {submitting ? 'Saving...' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Toolbar */}
      <DataTableToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter operators by name, email, or role..."
        totalCount={filteredUsers.length}
      />

      {/* Table */}
      {error && users.length === 0 ? (
        <ErrorState message={error} onRetry={fetchUsers} />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6 text-muted-foreground" />}
          title="No users found"
          description="Create operators to collaborate on worker safety monitoring."
          actionLabel="Add Operator"
          onAction={() => setIsDialogOpen(true)}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User & Email</TableHead>
                <TableHead>Security Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-semibold text-foreground text-xs">
                      {user.full_name || 'Unnamed Operator'}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                      <Mail className="size-3" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="font-mono text-[11px] uppercase tracking-wider capitalize px-2 py-0.5 bg-muted text-foreground border-border"
                    >
                      <Shield className="size-3 mr-1 text-amber-500" />
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={user.is_active ? 'active' : 'inactive'} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString([], {
                      dateStyle: 'medium',
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
