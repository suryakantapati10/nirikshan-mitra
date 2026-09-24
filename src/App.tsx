import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { GovStrip } from './components/layout/GovStrip';
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { Breadcrumb } from './components/layout/Breadcrumb';
import { Footer } from './components/layout/Footer';
import { RoleSelection } from './components/auth/RoleSelection';
import { InspectorLogin } from './components/auth/InspectorLogin';
import { AdminLogin } from './components/auth/AdminLogin';
import { InspectionStartLanding } from './components/dashboard/InspectionStartLanding';
import { ScanIntakePanel } from './components/dashboard/ScanIntakePanel';
import { ComplianceDashboard } from './components/compliance/ComplianceDashboard';
import { InspectionHistoryTable } from './components/history/InspectionHistoryTable';
import { AdminPanel } from './components/admin/AdminPanel';
import { CameraModal } from './components/modals/CameraModal';
import { BrandHistoryModal } from './components/modals/BrandHistoryModal';

import { classificationService } from './services/classificationService';
import { ocrService } from './services/ocrService';
import { fieldExtractor } from './services/fieldExtractor';
import { complianceEngine } from './services/complianceEngine';
import { complianceScorer } from './services/complianceScorer';
import { inspectionService } from './services/inspectionService';
import { reportService } from './services/reportService';

import { PanelKey, PanelData, ClassificationResult, ClassificationStatus } from './types/package';
import { OcrDiagnostics, InspectionRecord } from './types/inspection';
import { ExtractedFields, RuleEvaluation, ComplianceScore } from './types/compliance';

export const App: React.FC = () => {
  const { isAuthenticated, role } = useAuth();

  // Navigation & Routing state
  const [authView, setAuthView] = useState<'role-select' | 'inspector-login' | 'admin-login'>('role-select');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'admin'>('dashboard');
  const [dashboardView, setDashboardView] = useState<'landing' | 'scan' | 'assessment'>('landing');

  // Multi-panel & Inspection Intake State
  const [panels, setPanels] = useState<Record<PanelKey, PanelData | null>>({
    front: null,
    back: null,
    side: null,
    top_bottom: null
  });
  const [primaryImage, setPrimaryImage] = useState<{
    file: File | null;
    dataUrl: string | null;
    name: string;
    size: string;
  }>({
    file: null,
    dataUrl: null,
    name: '',
    size: ''
  });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [classificationStatus, setClassificationStatus] = useState<ClassificationStatus>('idle');
  const classificationRequestIdRef = useRef<number>(0);

  // Analysis / Pipeline Progress State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisTitle, setAnalysisTitle] = useState('Initializing scan...');
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [rawOcrText, setRawOcrText] = useState('');
  const [diagnostics, setDiagnostics] = useState<OcrDiagnostics>({
    engine: 'Gemini Vision (Server API)',
    quality: 'Standard',
    characterCount: 0,
    readable: true
  });

  // Assessment Results State
  const [extractedFields, setExtractedFields] = useState<ExtractedFields | null>(null);
  const [complianceResults, setComplianceResults] = useState<RuleEvaluation[]>([]);
  const [complianceScore, setComplianceScore] = useState<ComplianceScore | null>(null);
  const [currentInspectionId, setCurrentInspectionId] = useState<string | null>(null);
  const [isHistoricalView, setIsHistoricalView] = useState(false);

  // History State
  const [inspectionsList, setInspectionsList] = useState<InspectionRecord[]>([]);

  // Modals
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraPanelKey, setCameraPanelKey] = useState<PanelKey>('front');
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('');

  // Load inspection history when navigating to History tab
  const loadHistory = async () => {
    try {
      const res = await inspectionService.getAllInspections();
      if (res.success && Array.isArray(res.inspections)) {
        setInspectionsList(res.inspections);
      }
    } catch (err) {
      console.warn('Failed to load inspections:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === 'history') {
      loadHistory();
    }
  }, [isAuthenticated, activeTab]);

  // Handle Breadcrumb title
  const getBreadcrumbTitle = () => {
    if (activeTab === 'history') return 'Inspection History';
    if (activeTab === 'admin') return 'System Administration';
    if (dashboardView === 'scan') return 'Intake & Multi-Panel Scan';
    if (dashboardView === 'assessment') return 'Compliance Assessment';
    return 'Dashboard';
  };

  // 1. Landing Actions
  const handleStartUpload = () => {
    setDashboardView('scan');
  };

  const handleStartCamera = () => {
    setDashboardView('scan');
    setCameraPanelKey('front');
    setIsCameraOpen(true);
  };

  // Helper: File to data URL
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  };

  // Helper: Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 2. File Selection Handler (Primary Scan or Drop)
  const handleFileSelect = async (file: File) => {
    try {
      setUploadError(null);
      const dataUrl = await fileToDataUrl(file);
      const sizeStr = formatFileSize(file.size);

      setPrimaryImage({
        file,
        dataUrl,
        name: file.name,
        size: sizeStr
      });

      setPanels((prev) => ({
        ...prev,
        front: {
          key: 'front',
          label: 'Front / Main',
          file,
          dataUrl,
          name: file.name,
          size: sizeStr,
          timestamp: Date.now()
        }
      }));

      // Immediately disable Analyze Product and set classification status to loading
      setClassification(null);
      setClassificationStatus('loading');
      const reqId = ++classificationRequestIdRef.current;

      // Trigger automatic package classification
      try {
        const clsResult = await classificationService.classifyImage(file);
        if (reqId !== classificationRequestIdRef.current) return;
        setClassification(clsResult);
        if (clsResult && clsResult.isError) {
          setClassificationStatus('error');
        } else {
          setClassificationStatus('success');
        }
      } catch (err) {
        if (reqId !== classificationRequestIdRef.current) return;
        console.warn('Package classification failed:', err);
        setClassificationStatus('error');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process selected file');
      setClassificationStatus('idle');
    }
  };

  // 3. Panel-Specific Upload Handlers
  const handlePanelUpload = async (panelKey: PanelKey, file: File) => {
    try {
      setUploadError(null);
      const dataUrl = await fileToDataUrl(file);
      const sizeStr = formatFileSize(file.size);

      const panelLabel =
        panelKey === 'front'
          ? 'Front / Main'
          : panelKey === 'back'
          ? 'Back / Rear'
          : panelKey === 'side'
          ? 'Side / Other'
          : 'Top / Bottom';

      const panelData: PanelData = {
        key: panelKey,
        label: panelLabel,
        file,
        dataUrl,
        name: file.name,
        size: sizeStr,
        timestamp: Date.now()
      };

      setPanels((prev) => ({
        ...prev,
        [panelKey]: panelData
      }));

      if (panelKey === 'front') {
        setPrimaryImage({
          file,
          dataUrl,
          name: file.name,
          size: sizeStr
        });
        setClassification(null);
        setClassificationStatus('loading');
        const reqId = ++classificationRequestIdRef.current;
        try {
          const clsResult = await classificationService.classifyImage(file);
          if (reqId !== classificationRequestIdRef.current) return;
          setClassification(clsResult);
          if (clsResult && clsResult.isError) {
            setClassificationStatus('error');
          } else {
            setClassificationStatus('success');
          }
        } catch (err) {
          if (reqId !== classificationRequestIdRef.current) return;
          console.warn('Classification failed:', err);
          setClassificationStatus('error');
        }
      }
    } catch (err: any) {
      setUploadError(err.message || `Failed to upload image for ${panelKey} panel`);
    }
  };

  const handlePanelCamera = (panelKey: PanelKey) => {
    setCameraPanelKey(panelKey);
    setIsCameraOpen(true);
  };

  const handleCameraCaptureComplete = (panelKey: PanelKey, file: File, dataUrl: string) => {
    setIsCameraOpen(false);
    const sizeStr = formatFileSize(file.size);
    const panelLabel =
      panelKey === 'front'
        ? 'Front / Main'
        : panelKey === 'back'
        ? 'Back / Rear'
        : panelKey === 'side'
        ? 'Side / Other'
        : 'Top / Bottom';

    const panelData: PanelData = {
      key: panelKey,
      label: panelLabel,
      file,
      dataUrl,
      name: `camera_${panelKey}_${Date.now()}.jpg`,
      size: sizeStr,
      timestamp: Date.now()
    };

    setPanels((prev) => ({
      ...prev,
      [panelKey]: panelData
    }));

    if (panelKey === 'front') {
      setPrimaryImage({
        file,
        dataUrl,
        name: panelData.name,
        size: sizeStr
      });
      setClassification(null);
      setClassificationStatus('loading');
      const reqId = ++classificationRequestIdRef.current;
      classificationService.classifyImage(file).then((clsResult) => {
        if (reqId !== classificationRequestIdRef.current) return;
        setClassification(clsResult);
        if (clsResult && clsResult.isError) {
          setClassificationStatus('error');
        } else {
          setClassificationStatus('success');
        }
      }).catch((err) => {
        if (reqId !== classificationRequestIdRef.current) return;
        console.warn('Classification failed:', err);
        setClassificationStatus('error');
      });
    }
  };

  const handlePanelRemove = (panelKey: PanelKey) => {
    setPanels((prev) => ({
      ...prev,
      [panelKey]: null
    }));
    if (panelKey === 'front') {
      setPrimaryImage({ file: null, dataUrl: null, name: '', size: '' });
      setClassification(null);
      setClassificationStatus('idle');
    }
  };

  const handleRemoveScan = () => {
    setPrimaryImage({ file: null, dataUrl: null, name: '', size: '' });
    setPanels({ front: null, back: null, side: null, top_bottom: null });
    setClassification(null);
    setClassificationStatus('idle');
    setUploadError(null);
    setRawOcrText('');
  };

  const handleRetryClassification = async () => {
    if (!primaryImage.file) return;
    setClassificationStatus('loading');
    const reqId = ++classificationRequestIdRef.current;
    try {
      const clsResult = await classificationService.classifyImage(primaryImage.file);
      if (reqId !== classificationRequestIdRef.current) return;
      setClassification(clsResult);
      if (clsResult && clsResult.isError) {
        setClassificationStatus('error');
      } else {
        setClassificationStatus('success');
      }
    } catch (err) {
      if (reqId !== classificationRequestIdRef.current) return;
      console.warn('Retry classification failed:', err);
      setClassificationStatus('error');
    }
  };

  // 4. Full Analysis Pipeline Execution
  const handleAnalyzeProduct = async () => {
    if (isAnalyzing || classificationStatus !== 'success') {
      return;
    }
    const activePanels = (['front', 'back', 'side', 'top_bottom'] as PanelKey[])
      .filter((k) => panels[k]?.dataUrl)
      .map((k) => ({
        key: k,
        label: panels[k]!.name,
        imageSource: panels[k]!.dataUrl,
        name: panels[k]!.name
      }));

    if (activePanels.length === 0) {
      setUploadError('Please select or capture at least one package panel image before analyzing.');
      return;
    }

    setIsAnalyzing(true);
    setCurrentStep(1);
    setProgressPercent(15);
    setAnalysisTitle('Classifying packaging geometry & type...');

    try {
      // Step 2: Ensure package classification is ready
      let activeClassification = classification;
      if (!activeClassification && primaryImage.file) {
        try {
          activeClassification = await classificationService.classifyImage(primaryImage.file);
          setClassification(activeClassification);
        } catch {
          // ignore
        }
      }

      setCurrentStep(3);
      setProgressPercent(35);
      setAnalysisTitle(`Extracting statutory text via Gemini OCR (${activePanels.length} panel${activePanels.length > 1 ? 's' : ''})...`);

      // Step 3 & 4: Multi-panel OCR
      const ocrResult = await ocrService.processPanels(activePanels, (_stage, pct, msg) => {
        setProgressPercent(35 + Math.round(pct * 0.35));
        setAnalysisTitle(msg);
      });

      setRawOcrText(ocrResult.text);
      if (ocrResult.diagnostics) {
        setDiagnostics(ocrResult.diagnostics);
      }

      setCurrentStep(5);
      setProgressPercent(75);
      setAnalysisTitle('Extracting Legal Metrology statutory fields...');

      // Step 5: Information Extraction
      let extracted: ExtractedFields;
      if (ocrResult.panels && ocrResult.panels.length > 1) {
        extracted = fieldExtractor.extractMultiPanelFields(ocrResult.panels);
      } else {
        extracted = fieldExtractor.extractFields(ocrResult.text);
      }
      setExtractedFields(extracted);

      setCurrentStep(6);
      setProgressPercent(88);
      setAnalysisTitle('Evaluating statutory rules & scoring compliance...');

      // Step 6: Compliance Evaluation & Scoring
      const evaluations = complianceEngine.evaluateAll(extracted);
      const score = complianceScorer.calculateScore(evaluations);

      setComplianceResults(evaluations);
      setComplianceScore(score);

      // Step 7: Auto-persist inspection to SQLite backend
      setProgressPercent(95);
      setAnalysisTitle('Persisting inspection record to official database...');

      const brandName = extracted.brand_name || extracted.manufacturer || 'Unknown Brand';
      const productName = extracted.product_name || 'Packaged Commodity';
      const riskLevel = score.statusKey === 'POTENTIAL_VIOLATION' ? 'HIGH' : score.statusKey === 'NEEDS_REVIEW' ? 'MEDIUM' : 'LOW';

      try {
        const saveRes = await inspectionService.saveInspection({
          product_name: productName,
          brand_name: brandName,
          manufacturer: extracted.manufacturer || 'Not Detected',
          package_type: activeClassification?.packageType || 'Other',
          overall_score: score.score,
          overall_status: score.statusKey,
          risk_level: riskLevel,
          fields: extracted,
          field_sources: extracted._sources || {},
          compliance_results: evaluations,
          ocr_diagnostics: ocrResult.diagnostics,
          raw_ocr_text: ocrResult.text
        });

        if (saveRes && saveRes.inspection_id) {
          setCurrentInspectionId(saveRes.inspection_id);
        }
      } catch (saveErr) {
        console.warn('Inspection persistence failed:', saveErr);
      }

      setProgressPercent(100);
      setAnalysisTitle('Analysis complete.');
      setIsHistoricalView(false);

      // Transition to Compliance Assessment Results View
      setTimeout(() => {
        setIsAnalyzing(false);
        setDashboardView('assessment');
      }, 400);
    } catch (err: any) {
      console.error('Pipeline error:', err);
      setIsAnalyzing(false);
      setUploadError(err.message || 'An error occurred during inspection analysis.');
    }
  };

  // 5. Historical Details Inspection Viewer
  const handleViewHistoricalDetails = async (id: string) => {
    try {
      const res = await inspectionService.getInspectionById(id);
      if (res.success && res.inspection) {
        const row = res.inspection;
        setCurrentInspectionId(row.inspection_id);

        let fields: ExtractedFields = {};
        if (row.fields && typeof row.fields === 'object') {
          fields = row.fields;
        } else if ((row as any).extracted_fields) {
          try {
            fields = typeof (row as any).extracted_fields === 'string'
              ? JSON.parse((row as any).extracted_fields)
              : (row as any).extracted_fields;
          } catch {
            fields = { product_name: row.product_name, manufacturer: row.manufacturer || '' };
          }
        } else {
          fields = { product_name: row.product_name, manufacturer: row.manufacturer || '' };
        }
        setExtractedFields(fields);

        let results: RuleEvaluation[] = [];
        if (row.compliance_results && Array.isArray(row.compliance_results)) {
          results = row.compliance_results;
        } else if ((row as any).compliance_results) {
          try {
            results = typeof (row as any).compliance_results === 'string'
              ? JSON.parse((row as any).compliance_results)
              : (row as any).compliance_results;
          } catch {
            results = complianceEngine.evaluateAll(fields);
          }
        } else {
          results = complianceEngine.evaluateAll(fields);
        }
        setComplianceResults(results);

        const score: ComplianceScore = complianceScorer.calculateScore(results);
        setComplianceScore(score);

        setRawOcrText(row.raw_ocr_text || '');
        if (row.ocr_diagnostics) {
          try {
            const diag = typeof row.ocr_diagnostics === 'string' ? JSON.parse(row.ocr_diagnostics) : row.ocr_diagnostics;
            setDiagnostics(diag);
          } catch {
            // ignore
          }
        }

        setIsHistoricalView(true);
        setActiveTab('dashboard');
        setDashboardView('assessment');
      }
    } catch (err) {
      console.warn('Failed to load historical inspection:', err);
    }
  };

  // 6. PDF Report Download
  const handleDownloadPdf = async (id?: string) => {
    const targetId = id || currentInspectionId;
    if (!targetId) {
      alert('Inspection ID not available for PDF generation.');
      return;
    }

    try {
      await reportService.triggerDownload(targetId);
    } catch (err: any) {
      alert(`Report download failed: ${err.message || 'Unknown error'}`);
    }
  };

  // 7. Reset and Scan Another
  const handleScanAnother = () => {
    handleRemoveScan();
    setCurrentInspectionId(null);
    setExtractedFields(null);
    setComplianceResults([]);
    setComplianceScore(null);
    setIsHistoricalView(false);
    setDashboardView('landing');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans">
      {/* 1. National Government Identification Strip */}
      <GovStrip />

      {/* 2. Portal Masthead & Auth Controls */}
      <Header onNavigate={(tab) => {
        if (tab === 'role-select') {
          setAuthView('role-select');
        } else {
          setActiveTab(tab as any);
        }
      }} />

      {/* 3. Primary Navigation Tabs (Dashboard, History, Admin) */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab as any);
          if (tab === 'dashboard' && dashboardView === 'assessment' && isHistoricalView) {
            setDashboardView('landing');
            setIsHistoricalView(false);
          }
        }}
      />

      {/* 4. Breadcrumb Bar */}
      <Breadcrumb
        currentTitle={getBreadcrumbTitle()}
        onHomeClick={() => {
          setActiveTab('dashboard');
          setDashboardView('landing');
          setIsHistoricalView(false);
        }}
      />

      {/* 5. Main View Content */}
      <main className="flex-1 w-full" id="main-content" tabIndex={-1}>
        {!isAuthenticated ? (
          /* Authentication Screens */
          <div className="py-8">
            {authView === 'role-select' && (
              <RoleSelection
                onSelectRole={(selected) =>
                  setAuthView(selected === 'admin' ? 'admin-login' : 'inspector-login')
                }
              />
            )}
            {authView === 'inspector-login' && (
              <InspectorLogin
                onBackToRoles={() => setAuthView('role-select')}
                onLoginSuccess={() => {
                  setActiveTab('dashboard');
                  setDashboardView('landing');
                }}
              />
            )}
            {authView === 'admin-login' && (
              <AdminLogin
                onBackToRoles={() => setAuthView('role-select')}
                onLoginSuccess={() => {
                  setActiveTab('dashboard');
                  setDashboardView('landing');
                }}
              />
            )}
          </div>
        ) : (
          /* Authenticated Pages */
          <div className="w-full">
            {/* TAB 1: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <>
                {dashboardView === 'landing' && (
                  <InspectionStartLanding
                    onStartUpload={handleStartUpload}
                    onStartCamera={handleStartCamera}
                  />
                )}

                {dashboardView === 'scan' && (
                  <ScanIntakePanel
                    onBackToDashboard={() => setDashboardView('landing')}
                    previewSrc={primaryImage.dataUrl}
                    fileName={primaryImage.name}
                    fileSize={primaryImage.size}
                    uploadError={uploadError}
                    onFileSelect={handleFileSelect}
                    onRemoveScan={handleRemoveScan}
                    onAnalyzeProduct={handleAnalyzeProduct}
                    isAnalyzing={isAnalyzing}
                    analysisTitle={analysisTitle}
                    progressPercent={progressPercent}
                    currentStep={currentStep}
                    classification={classification}
                    classificationStatus={classificationStatus}
                    onRetryClassification={handleRetryClassification}
                    panels={panels}
                    onPanelUpload={handlePanelUpload}
                    onPanelCamera={handlePanelCamera}
                    onPanelRemove={handlePanelRemove}
                    rawOcrText={rawOcrText}
                    diagnostics={diagnostics}
                    onContinueToAssessment={() => setDashboardView('assessment')}
                  />
                )}

                {dashboardView === 'assessment' && extractedFields && complianceScore && (
                  <ComplianceDashboard
                    fields={extractedFields}
                    complianceResults={complianceResults}
                    scoreData={complianceScore}
                    ocrDiagnostics={diagnostics}
                    imageSrc={primaryImage.dataUrl || undefined}
                    imageName={primaryImage.name || undefined}
                    imageSize={primaryImage.size || undefined}
                    rawOcrText={rawOcrText}
                    isHistorical={isHistoricalView}
                    inspectionId={currentInspectionId || undefined}
                    onBackToDashboard={() => setDashboardView('landing')}
                    onBackToHistory={() => setActiveTab('history')}
                    onDownloadPdf={() => handleDownloadPdf()}
                    onOpenBrandHistory={(brand) => {
                      setSelectedBrand(brand);
                      setIsBrandModalOpen(true);
                    }}
                    onScanAnother={handleScanAnother}
                  />
                )}
              </>
            )}

            {/* TAB 2: INSPECTION HISTORY */}
            {activeTab === 'history' && (
              <InspectionHistoryTable
                inspections={inspectionsList}
                onRefresh={loadHistory}
                onGoToScan={() => {
                  setActiveTab('dashboard');
                  setDashboardView('scan');
                }}
                onViewDetails={handleViewHistoricalDetails}
                onViewBrandHistory={(brand) => {
                  setSelectedBrand(brand);
                  setIsBrandModalOpen(true);
                }}
                onDownloadPdf={handleDownloadPdf}
              />
            )}

            {/* TAB 3: ADMIN PANEL */}
            {activeTab === 'admin' && role === 'admin' && <AdminPanel />}
          </div>
        )}
      </main>

      {/* 6. Modals */}
      <CameraModal
        isOpen={isCameraOpen}
        panelKey={cameraPanelKey}
        onClose={() => setIsCameraOpen(false)}
        onCaptureComplete={handleCameraCaptureComplete}
      />

      <BrandHistoryModal
        isOpen={isBrandModalOpen}
        brandIdentifier={selectedBrand}
        onClose={() => setIsBrandModalOpen(false)}
      />

      {/* 7. Portal Footer */}
      <Footer />
    </div>
  );
};
