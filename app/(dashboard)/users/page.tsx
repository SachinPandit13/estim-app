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
import { Modal } from '@/components/ui/modal';
import { Users, Plus, Shield, Mail } from 'lucide-react';
import type { User, UserCreateInput } from '@/types/api';
import { useEstimUi } from '@/store/estim-ui-store';

export default function UsersPage() {
  const { toast } = useEstimUi();
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
      toast.success('Operator Registered', `User "${formData.email}" has been created.`);
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
      toast.error(
        'Registration Failed',
        err instanceof Error ? err.message : 'Failed to create user',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(term) ||
      Boolean(u.full_name && u.full_name.toLowerCase().includes(term)) ||
      u.role.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Users & Operator Access Control
          </h2>
          <p className="text-micro text-muted font-mono mt-0.5">
            Manage authenticated safety operators, supervisors, and administrative credentials
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          variant="default"
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="size-4" />
          Add Operator
        </Button>
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
          icon={<Users className="size-6 text-muted" />}
          title="No users found"
          description="Create operators to collaborate on worker safety monitoring."
          actionLabel="Add Operator"
          onAction={() => setIsDialogOpen(true)}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User & Email</th>
                  <th>Security Role</th>
                  <th>Status</th>
                  <th>Registered At</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="font-semibold text-foreground text-xs">
                        {user.full_name || 'Unnamed Operator'}
                      </div>
                      <div className="flex items-center gap-1.5 text-micro text-muted font-mono">
                        <Mail className="size-3" />
                        {user.email}
                      </div>
                    </td>
                    <td>
                      <Badge
                        variant="outline"
                        className="font-mono text-[11px] uppercase tracking-wider capitalize px-2 py-0.5 bg-surface-raised text-foreground border-border"
                      >
                        <Shield className="size-3 mr-1 text-brand" />
                        {user.role}
                      </Badge>
                    </td>
                    <td>
                      <StatusBadge status={user.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="font-mono text-meta text-muted">
                      {new Date(user.created_at).toLocaleDateString([], {
                        dateStyle: 'medium',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register Operator Modal */}
      <Modal
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Register Facility Operator"
        description="Grant safety console access to supervisors and safety team members."
        maxWidth="max-w-[28rem]"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="user-form"
              loading={submitting}
              loadingText="Saving..."
              variant="default"
            >
              Create User
            </Button>
          </div>
        }
      >
        <form id="user-form" onSubmit={handleSubmit} className="space-y-3.5">
          <Input
            label="Email Address"
            type="email"
            required
            placeholder="operator@facility.internal"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <Input
            label="Full Name"
            placeholder="e.g. Marcus Vance"
            value={formData.full_name || ''}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="h-9 w-full rounded-[10px] border border-border bg-surface px-2.5 text-xs text-foreground font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
              >
                <option value="member">Member</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <Input
              label="Initial Password"
              type="password"
              placeholder="••••••••"
              value={formData.password || ''}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
