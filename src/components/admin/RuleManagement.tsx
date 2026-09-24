import React from 'react';
import { RuleDefinition } from '../../types/compliance';
import { adminService } from '../../services/adminService';

interface RuleManagementProps {
  rules: RuleDefinition[];
  onRefresh: () => void;
}

export const RuleManagement: React.FC<RuleManagementProps> = ({ rules, onRefresh }) => {
  const handleToggleRule = async (ruleId: string, currentActive: boolean) => {
    try {
      const res = await adminService.updateRuleStatus(ruleId, !currentActive);
      if (res.success) {
        onRefresh();
      } else {
        alert('Rule status update error: ' + (res.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Request failed: ' + err.message);
    }
  };

  return (
    <div className="admin-card bg-white border border-slate-200 rounded-md p-6 shadow-xs text-xs">
      <div className="admin-card-header-row flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
        <div>
          <h3 className="admin-card-title text-base font-bold text-[#0B1F33] m-0">
            Legal Metrology Compliance Rule Roster
          </h3>
          <p className="admin-card-desc text-slate-500 m-0 text-xs">
            Active statutory rules evaluated by the compliance engine under Packaged Commodities Rules, 2011.
          </p>
        </div>
        <span id="admin-rule-count-badge" className="count-badge bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded text-xs border border-slate-200">
          {rules.length} Rules
        </span>
      </div>

      <div className="admin-table-container overflow-x-auto">
        <table className="admin-table w-full text-left text-xs border-collapse" aria-label="Legal Metrology Rules Table">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold text-[11px] uppercase tracking-wider">
              <th className="p-3">Rule ID</th>
              <th className="p-3">Rule Name</th>
              <th className="p-3">Statutory Reference</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Enforcement Toggle</th>
            </tr>
          </thead>
          <tbody id="rules-table-tbody" className="divide-y divide-slate-100">
            {rules.map((r) => {
              const isActive = Boolean(r.active);

              return (
                <tr key={r.rule_id} className="hover:bg-slate-50/50">
                  <td className="p-3">
                    <span className="mono-id text-[#0056A6] font-mono font-semibold">{r.rule_id}</span>
                  </td>
                  <td className="p-3 font-bold text-slate-900">{r.rule_name}</td>
                  <td className="p-3 text-slate-500 text-[11.5px] max-w-sm">
                    {r.source_reference || 'Legal Metrology Rules, 2011'}
                  </td>
                  <td className="p-3">
                    {isActive ? (
                      <span className="badge-status-active text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
                        Active
                      </span>
                    ) : (
                      <span className="badge-status-inactive text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">
                        Disabled
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => handleToggleRule(r.rule_id, true)}
                        className="btn-toggle-status btn-deactivate btn-toggle-rule text-red-700 hover:text-red-900 font-semibold cursor-pointer text-xs"
                        data-id={r.rule_id}
                        data-status="0"
                      >
                        Disable Rule
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleRule(r.rule_id, false)}
                        className="btn-toggle-status btn-activate btn-toggle-rule text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer text-xs"
                        data-id={r.rule_id}
                        data-status="1"
                      >
                        Enable Rule
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
  );
};
