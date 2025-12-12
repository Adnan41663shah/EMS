import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Plus, Search, Users as UsersIcon, Edit3, Trash2 } from 'lucide-react';
import apiService from '@/services/api';
import { User, UserRole } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { cn } from '@/utils/cn';

const Users: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'user' as UserRole, isActive: true, password: '' });
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading } = useQuery(
    ['admin-users', search, roleFilter, page, limit],
    () => apiService.users.getAll({ search, role: roleFilter || undefined, page, limit }),
    { keepPreviousData: true }
  );
  const users: User[] = useMemo(() => data?.data?.users || [], [data]);
  const pagination = data?.data?.pagination;

  const openCreate = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', phone: '', role: 'user', isActive: true, password: '' });
    setShowModal(true);
  };
  const openEdit = (u: User) => {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, phone: u.phone || '', role: u.role, isActive: u.isActive, password: '' });
    setShowModal(true);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page when search changes
  };

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    setPage(1); // Reset to first page when role filter changes
  };

  const saveUser = async () => {
    try {
      setIsSaving(true);
      if (editingUser) {
        await apiService.users.update(editingUser.id || (editingUser as any)._id, { name: form.name, email: form.email, phone: form.phone, role: form.role, isActive: form.isActive });
      } else {
        const payload: any = { name: form.name, email: form.email, role: form.role, isActive: form.isActive };
        if (form.phone) payload.phone = form.phone;
        if (form.password) payload.password = form.password;
        await apiService.users.create(payload);
      }
      setShowModal(false);
      queryClient.invalidateQueries(['admin-users']);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (u: User) => {
    await apiService.users.toggleStatus(u.id || (u as any)._id);
    queryClient.invalidateQueries(['admin-users']);
  };

  const deleteUser = async (u: User) => {
    if (!confirm('Delete this user?')) return;
    await apiService.users.delete(u.id || (u as any)._id);
    queryClient.invalidateQueries(['admin-users']);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">Manage system users and permissions</p>
        </div>
        <button className="btn btn-primary btn-sm sm:btn-md text-xs sm:text-sm px-3 sm:px-4" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" /> New User
        </button>
      </div>

      <div className="card">
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                <input className="input pl-10 sm:pl-12 text-xs sm:text-sm" placeholder="Search by name or email" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by Role
              </label>
              <select
                className="input text-xs sm:text-sm"
                value={roleFilter}
                onChange={(e) => handleRoleFilterChange(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="user">Normal User</option>
                <option value="presales">Presales</option>
                <option value="sales">Sales</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Results Count - Top Left */}
          {pagination && (pagination.totalPages > 0 || users.length > 0) && !isLoading && users.length > 0 && (
            <div className="mb-4 ">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {users.length} of {pagination.totalUsers || pagination.totalItems || users.length} results
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-48"><LoadingSpinner size="lg" /></div>
          ) : users.length === 0 ? (
            <div className="text-center py-16">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="hidden sm:table-cell px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                    <th className="hidden md:table-cell px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-1.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((u) => (
                    <tr key={u.id || (u as any)._id} className={cn(
                      "hover:bg-gray-50 dark:hover:bg-gray-800",
                      u.role === 'admin' && "bg-purple-50 dark:bg-purple-900/20"
                    )}>
                      <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 dark:text-white">{u.name}</td>
                      <td className="hidden sm:table-cell px-3 py-1 whitespace-nowrap text-xs text-gray-900 dark:text-white">{u.email}</td>
                      <td className="px-3 py-1 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                          u.role === 'admin' && "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
                          u.role === 'presales' && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                          u.role === 'sales' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                          u.role === 'user' && "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                        )}>
                          {u.role}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-3 py-1 whitespace-nowrap">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', u.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200')}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-1 whitespace-nowrap text-right text-xs font-medium">
                        <div className="flex items-center justify-end gap-1">
                          <button className="btn btn-outline btn-xs text-xs px-1 py-0.5" onClick={() => toggleStatus(u)}>
                            <span className="hidden sm:inline">{u.isActive ? 'Deactivate' : 'Activate'}</span>
                            <span className="sm:hidden">{u.isActive ? 'Off' : 'On'}</span>
                          </button>
                          <button className="btn btn-secondary btn-xs text-xs px-1 py-0.5" onClick={() => openEdit(u)}>
                            <Edit3 className="h-3 w-3 sm:mr-1" /> <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button className="btn btn-ghost btn-xs text-xs px-1 py-0.5" onClick={() => deleteUser(u)}>
                            <Trash2 className="h-3 w-3 sm:mr-1" /> <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination - Right Side */}
          {pagination && (pagination.totalPages > 0 || users.length > 0) && (
            <div className="card-footer">
              <div className="">
                <div className="flex space-x-2 my-4 ms-[-23px]">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="btn btn-outline btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="flex items-center px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                    Page {pagination.currentPage} of {pagination.totalPages || 1}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className="btn btn-outline btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-4 sm:p-6 mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{editingUser ? 'Edit User' : 'Create User'}</h3>
                <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl sm:text-2xl" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input className="input text-xs sm:text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input className="input text-xs sm:text-sm" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input className="input text-xs sm:text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select className="input text-xs sm:text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                  <option value="user">User</option>
                  <option value="presales">Presales</option>
                  <option value="sales">Sales</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {!editingUser && (
                <div className="md:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                  <input className="input text-xs sm:text-sm" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
              )}
            </div>
            <div className="mt-4 sm:mt-6 flex items-center justify-end gap-2 sm:gap-3">
              <button className="btn btn-cancel btn-sm text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2" onClick={() => setShowModal(false)} disabled={isSaving}>Cancel</button>
              <button className="btn btn-primary btn-sm text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2" onClick={saveUser} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
