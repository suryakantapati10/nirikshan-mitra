import React, { useState, useEffect } from 'react';
import { OfficerManagement } from './OfficerManagement';
import { RuleManagement } from './RuleManagement';
import { adminService } from '../../services/adminService';
import { User } from '../../types/auth';
import { RuleDefinition } from '../../types/compliance';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'rules'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [rules, setRules] = useState<RuleDefinition[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, rulesRes] = await Promise.all([
        adminService.getUsers(),
        adminService.getRules()
      ]);
      if (usersRes.success && usersRes.users) setUsers(usersRes.users);
      if (rulesRes.success && rulesRes.rules) setRules(rulesRes.rules);
    } catch (err) {
      console.warn('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <section id="admin-section" className="view-section admin-panel max-w-7xl mx-auto px-4 sm:px-8 py-6" aria-labelledby="admin-heading">
      <div className="admin-header flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <div className="admin-eyebrow flex items-center space-x-2 text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">
            <span className="officer-role-badge badge-role-admin bg-amber-50 border border-amber-300 px-2 py-0.5 rounded">
              ADMINISTRATOR CONTROL
            </span>
            <span className="text-slate-500">Department of Consumer Affairs &middot; Legal Metrology</span>
          </div>
          <h2 id="admin-heading" className="admin-title text-2xl font-bold text-[#0B1F33] m-0">
            System Administration &amp; Governance
          </h2>
          <p className="section-desc text-xs text-slate-500 m-0 mt-1">
            Manage authorized inspection personnel accounts and Legal Metrology compliance rule configurations.
          </p>
        </div>

        <div className="admin-header-actions">
          <button
            type="button"
            id="btn-refresh-admin"
            onClick={loadData}
            disabled={loading}
            className="btn btn-outline btn-sm border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Admin Sub-Navigation Tabs */}
      <div className="admin-tabs-nav flex space-x-2 mb-6 border-b border-slate-200" role="tablist">
        <button
          type="button"
          className={`admin-tab-btn px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'users'
              ? 'text-[#0056A6] border-[#0056A6] active'
              : 'text-slate-600 border-transparent hover:text-slate-900'
          }`}
          id="btn-tab-users"
          role="tab"
          aria-selected={activeTab === 'users'}
          data-tab="users"
          onClick={() => setActiveTab('users')}
        >
          👥 Officer Accounts
        </button>
        <button
          type="button"
          className={`admin-tab-btn px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'rules'
              ? 'text-[#0056A6] border-[#0056A6] active'
              : 'text-slate-600 border-transparent hover:text-slate-900'
          }`}
          id="btn-tab-rules"
          role="tab"
          aria-selected={activeTab === 'rules'}
          data-tab="rules"
          onClick={() => setActiveTab('rules')}
        >
          ⚖️ Legal Metrology Rules
        </button>
      </div>

      {/* Tab Views */}
      {activeTab === 'users' && (
        <div id="admin-view-users" className="admin-tab-content">
          <OfficerManagement users={users} onRefresh={loadData} />
        </div>
      )}

      {activeTab === 'rules' && (
        <div id="admin-view-rules" className="admin-tab-content">
          <RuleManagement rules={rules} onRefresh={loadData} />
        </div>
      )}
    </section>
  );
};
