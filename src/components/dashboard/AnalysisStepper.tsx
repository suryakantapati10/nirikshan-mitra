import React from 'react';

interface AnalysisStepperProps {
  statusTitle: string;
  progressPercent: number;
  currentStep: number; // 1 to 4
  isActive: boolean;
}

export const AnalysisStepper: React.FC<AnalysisStepperProps> = ({
  statusTitle,
  progressPercent,
  currentStep,
  isActive
}) => {
  if (!isActive) return null;

  const steps = [
    { id: 'step-1', title: '1. Image Processing' },
    { id: 'step-2', title: '2. Text Recognition' },
    { id: 'step-3', title: '3. Declaration Extraction' },
    { id: 'step-4', title: '4. Compliance Assessment' }
  ];

  return (
    <div id="analysis-progress-box" className="analysis-progress-box bg-white border border-slate-200 rounded p-4 mb-4 text-xs shadow-xs" aria-live="polite">
      <div className="analysis-header flex items-center space-x-2.5 mb-3">
        {progressPercent < 100 && (
          <span
            className="spinner w-4 h-4 border-2 border-slate-300 border-t-[#0056A6] rounded-full animate-spin flex-shrink-0"
            id="analysis-spinner"
            aria-hidden="true"
          ></span>
        )}
        <h4 id="analysis-status-title" className="text-sm font-bold text-slate-800 m-0">
          {statusTitle}
        </h4>
      </div>

      <div
        className="progress-bar-track w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden border border-slate-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
        id="progress-bar-track"
      >
        <div
          className="progress-bar-fill bg-[#0056A6] h-full transition-all duration-300 rounded-full"
          id="progress-bar-fill"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      <ol className="analysis-steps-list flex flex-wrap items-center justify-between gap-2 m-0 p-0 list-none text-xs" id="analysis-steps-list">
        {steps.map((s, idx) => {
          const stepNum = idx + 1;
          const isDone = currentStep > stepNum;
          const isCurrent = currentStep === stepNum;

          return (
            <li
              key={s.id}
              id={s.id}
              className={`analysis-step flex items-center space-x-1 font-medium ${
                isDone
                  ? 'text-emerald-700 completed'
                  : isCurrent
                  ? 'text-[#0056A6] font-bold active'
                  : 'text-slate-400'
              }`}
            >
              <span className="step-icon text-xs">
                {isDone ? '✓' : isCurrent ? '⏳' : '⚪'}
              </span>
              <span>{s.title}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
