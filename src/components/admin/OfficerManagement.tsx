import React, { useState } from 'react';
import { User } from '../../types/auth';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';

interface OfficerManagementProps {
  users: User[];
  onRefresh: () => void;
}

export const OfficerManagement: React.FC<OfficerManagementProps> = ({ users, onRefresh }) => {
  const { user: currentUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'inspector' | 'admin'>('inspector');
  const [password, setPassword] = useState('');
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertInfo(null);
    setIsSubmitting(true);

    try {
      const res = await adminService.createUser({ name, email, role, password });
      if (res.success && res.user) {
        setAlertInfo({
          type: 'success',
          message: `Account created successfully for ${res.user.name} (${res.user.role})`
        });
        setName('');
        setEmail('');
        setPassword('');
        onRefresh();
      } else {
        setAlertInfo({
          type: 'error',
          message: res.error || 'Failed to create officer account.'
        });
      }
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: 'Network error: ' + err.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId: number | string, currentActive: boolean) => {
    try {
      const res = await adminService.updateUserStatus(userId, !currentActive);
      if (res.success) {
        onRefresh();
      } else {
        alert('Status update error: ' + (res.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Request failed: ' + err.message);
    }
  };

  return (
    <div className="admin-grid-layout grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-xs">
      {/* Left Column: Create Officer Form */}
      <div className="admin-card admin-create-user-card bg-white border border-slate-200 rounded-md p-6 shadow-xs">
        <h3 className="admin-card-title text-base font-bold text-[#0B1F33] m-0 mb-1">
          Provision New Officer Account
        </h3>
        <p className="admin-card-desc text-slate-500 m-0 mb-4 text-[11.5px]">
          Grant access to inspectors or system administrators with verified credentials.
        </p>

        <form id="form-create-user" onSubmit={handleCreate} className="admin-form space-y-3.5" autoComplete="off">
          {alertInfo && (
            <div
              id="create-user-alert"
              className={`admin-alert p-2.5 rounded font-medium text-xs ${
                alertInfo.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 alert-success'
                  : 'bg-red-50 text-red-800 border border-red-200 alert-error'
              }`}
            >
              {alertInfo.message}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="create-user-name" className="block text-slate-700 font-semibold mb-1">
              Full Officer Name <span className="required-star text-red-600">*</span>
            </label>
            <input
              type="text"
              id="create-user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-control w-full border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:border-[#0056A6]"
              placeholder="e.g. Inspector R. Sharma"
              required
              minLength={2}
            />
          </div>

          <div className="form-group">
            <label htmlFor="create-user-email" className="block text-slate-700 font-semibold mb-1">
              Government Email Address <span className="required-star text-red-600">*</span>
            </label>
            <input
              type="email"
              id="create-user-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control w-full border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:border-[#0056A6]"
              placeholder="e.g. officer@nirikshan.gov.in"
              required
            />
          </div>

          <div className="form-row grid grid-cols-2 gap-3">
            <div className="form-group">
              <label htmlFor="create-user-role" className="block text-slate-700 font-semibold mb-1">
                Assigned Role <span className="required-star text-red-600">*</span>
              </label>
              <select
                id="create-user-role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'inspector' | 'admin')}
                className="form-control w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-[#0056A6]"
                required
              >
                <option value="inspector">Inspector</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="create-user-password" className="block text-slate-700 font-semibold mb-1">
                Initial Password <span className="required-star text-red-600">*</span>
              </label>
              <input
                type="password"
                id="create-user-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control w-full border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:border-[#0056A6]"
                placeholder="Min 6 chars"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            id="btn-create-user-submit"
            disabled={isSubmitting}
            className="btn btn-primary btn-block w-full bg-[#0056A6] hover:bg-[#004482] text-white font-bold py-2 px-4 rounded text-xs transition-colors cursor-pointer disabled:opacity-50 mt-2"
          >
            {isSubmitting ? 'Provisioning Account...' : 'Provision Officer Account'}
          </button>
        </form>
      </div>

      {/* Right Column: Officer Roster Table */}
      <div className="admin-card admin-users-roster-card bg-white border border-slate-200 rounded-md p-6 shadow-xs lg:col-span-2">
        <div className="admin-card-header-row flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
          <div>
            <h3 className="admin-card-title text-base font-bold text-[#0B1F33] m-0">
              Authorized Personnel Roster
            </h3>
            <p className="admin-card-desc text-slate-500 m-0 text-xs">
              Active and inactive accounts registered in the database.
            </p>
          </div>
          <span id="admin-user-count-badge" className="count-badge bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded text-xs border border-slate-200">
            {users.length} Users
          </span>
        </div>

        <div className="admin-table-container overflow-x-auto">
          <table className="admin-table w-full text-left text-xs border-collapse" aria-label="Officer Users Table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold text-[11px] uppercase tracking-wider">
                <th className="p-3">Officer Name</th>
                <th className="p-3">Email Address</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody id="users-table-tbody" className="divide-y divide-slate-100">
              {users.map((u) => {
                const isSelf = currentUser && currentUser.id === u.id;
                const isActive = Boolean(u.active);
                const roleBadgeClass =
                  u.role === 'admin'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-blue-50 text-blue-800 border-blue-300';

                return (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-900">{u.name}</td>
                    <td className="p-3 text-slate-600 font-mono text-[11px]">{u.email}</td>
                    <td className="p-3">
                      <span className={`officer-role-badge text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${roleBadgeClass}`}>
                        {u.role === 'admin' ? 'Administrator' : 'Inspector'}
                      </span>
                    </td>
                    <td className="p-3">
                      {isActive ? (
                        <span className="badge-status-active text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="badge-status-inactive text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {isSelf ? (
                        <span className="text-[11px] text-slate-400 font-semibold">
                          (Current Officer)
                        </span>
                      ) : isActive ? (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u.id, true)}
                          className="btn-toggle-status btn-deactivate btn-toggle-user text-red-700 hover:text-red-900 font-semibold cursor-pointer text-xs"
                          data-id={u.id}
                          data-status="0"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u.id, false)}
                          className="btn-toggle-status btn-activate btn-toggle-user text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer text-xs"
                          data-id={u.id}
                          data-status="1"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
