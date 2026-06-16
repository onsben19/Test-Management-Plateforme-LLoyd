import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { campaignService, executionService, anomalyService, aiService } from '../services/api';
import { CheckCircle, XCircle, AlertTriangle, Eye, List, Calendar, Layers, LayoutGrid, Search, Filter, User, Sparkles, TrendingUp, Clock, ChevronRight, ChevronLeft, Play, Code, X, Sidebar, Loader, RefreshCw, Edit2, Maximize2, Terminal, ShieldAlert, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import Pagination from '../components/Pagination';
import { motion, AnimatePresence } from 'framer-motion';
import StatCard from '../components/StatCard';
import { Target, Activity, FileText as FileIcon } from 'lucide-react';
import QANewsHub from '../components/QANewsHub';
import ValidateCasDeTest from '../components/ValidateCasDeTest';
import { PendingReinforcements } from '../components/PendingReinforcements';

const highlightPlaywrightCode = (rawCode: string) => {
    if (!rawCode) return '';

    // Escape HTML to prevent injection / breaking layout
    let escaped = rawCode
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Tokenize comments
    const comments: string[] = [];
    escaped = escaped.replace(/(\/\/.*|\/\*[\s\S]*?\*\/)/g, (match) => {
        comments.push(match);
        return `__COMMENT_PLACEHOLDER_${comments.length - 1}__`;
    });

    // Tokenize string literals (single, double quotes and backticks)
    const strings: string[] = [];
    escaped = escaped.replace(/(["'`])(.*?)\1/g, (match) => {
        strings.push(match);
        return `__STRING_PLACEHOLDER_${strings.length - 1}__`;
    });

    // Highlight keywords safely
    escaped = escaped
        .replace(/\b(import|export|from|const|let|var|function|class|return|await|async|if|else|for|while|try|catch|new|test|describe)\b/g,
            '<span class="text-[#7dd3fc] font-semibold">$1</span>') // Light blue keywords
        .replace(/\b(expect|page)\b/g,
            '<span class="text-[#c084fc] font-semibold">$1</span>') // Purple expect/page
        .replace(/\b(goto|click|fill|locator|getByRole|getByText|getByPlaceholder|getByLabel|getByTestId|toBeVisible|toContainText|toHaveURL|toHaveTitle|toHaveCount|isChecked|isDisabled|isEnabled|isVisible|press|type)\b/g,
            '<span class="text-[#34d399] font-medium">$1</span>'); // Emerald functions

    // Restore strings and comments with proper highlight styling
    escaped = escaped.replace(/__STRING_PLACEHOLDER_(\d+)__/g, (_, index) => {
        const original = strings[parseInt(index, 10)];
        return `<span class="text-[#fca5a5]">${original}</span>`; // Light red strings
    });

    escaped = escaped.replace(/__COMMENT_PLACEHOLDER_(\d+)__/g, (_, index) => {
        const original = comments[parseInt(index, 10)];
        return `<span class="text-slate-500 italic">${original}</span>`; // Slate comments
    });

    return escaped;
};

// Campaign Enrichment Helper — computed purely from real API data + optional ML insights
const getCampaignEnrichedData = (camp: any, mlData?: any) => {
    // 1. Raw counts from API
    const total     = camp.nb_test_cases  ?? 0;
    const passed    = camp.passed_count   ?? 0;
    const failed    = camp.failed_count   ?? 0;
    const anomalies = camp.anomalies_count ?? 0;

    // 2. Derived metrics
    const percentage = total > 0 ? Math.round(((passed + failed) / total) * 100) : 0;
    const restants   = Math.max(0, total - passed - failed);
    const release_type = camp.release_type || 'RECETTE';
    const manager = camp.manager_name || camp.imported_by_name || 'Non défini';

    // 3. Real dates from API
    const debut    = camp.start_date         ? new Date(camp.start_date)
                   : camp.created_at         ? new Date(camp.created_at)
                   : new Date();
    const echeance = camp.estimated_end_date ? new Date(camp.estimated_end_date)
                   : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 4. ML-augmented fields (from Timeline Guard, optional)
    const velocity = mlData?.velocity ?? (passed + failed > 0 ? 1 : 0);
    const fin_ia   = mlData?.projected_end_date
                   ? new Date(mlData.projected_end_date)
                   : echeance;

    // 5. Retard: days between echeance and fin_ia when fin_ia > echeance
    const retard = mlData?.delay_days != null
        ? mlData.delay_days
        : fin_ia > echeance
            ? Math.ceil((fin_ia.getTime() - echeance.getTime()) / 86_400_000)
            : 0;

    // 6. Deadline today: is today the echeance day?
    const today = new Date();
    const deadline_today =
        echeance.getFullYear() === today.getFullYear() &&
        echeance.getMonth()    === today.getMonth()    &&
        echeance.getDate()     === today.getDate();

    return {
        release_type,
        nb_test_cases: total,
        passed_count:  passed,
        failed_count:  failed,
        anomalies_count: anomalies,
        manager,
        velocity,
        restants,
        retard,
        deadline_today,
        debut,
        echeance,
        fin_ia,
        percentage,
    };
};

const TesterDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [groupMode, setGroupMode] = useState<'none' | 'release' | 'project'>('release');
    const [releaseTypeFilter, setReleaseTypeFilter] = useState<'all' | 'PREPROD' | 'RECETTE'>('all');
    const pageSize = 12;

    const [validationModal, setValidationModal] = useState<{ isOpen: boolean; campaign: any | null }>({
        isOpen: false,
        campaign: null
    });

    // States for Campaign Details Side Drawer & Calendar Popover
    const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
    const [calendarCurrentDate, setCalendarCurrentDate] = useState<Date>(new Date(2026, 5, 15)); // Default to June 2026
    const [filterType, setFilterType] = useState<'all' | 'deadline' | 'retard'>('all');
    const [activeDetailCampaign, setActiveDetailCampaign] = useState<any | null>(null);
    const [isReformulating, setIsReformulating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
    const [isValidationOpen, setIsValidationOpen] = useState(false);
    const [validationMode, setValidationMode] = useState<'ia' | 'manual' | null>(null);
    const [blinkingDateType, setBlinkingDateType] = useState<'debut' | 'echeance' | 'fin_ia' | null>(null);

    const closeAllCals = () => {
        setCalendarOpen(false);
    };

    const closeDrawer = () => {
        setSelectedCampaignId(null);
        setIsDrawerOpen(false);
        closeAllCals();
    };

    const openDrawer = (campaignId: number) => {
        if (selectedCampaignId === campaignId && isDrawerOpen) {
            closeDrawer();
            return;
        }
        setSelectedCampaignId(campaignId);
        setIsDrawerOpen(true);
        closeAllCals();

        // Dynamically initialize calendar date to the campaign debut month/year
        const camp = campaigns.find(c => c.id === campaignId);
        if (camp) {
            const enriched = getCampaignEnrichedData(camp, mlInsights[camp.id]);
            setCalendarCurrentDate(new Date(enriched.debut.getFullYear(), enriched.debut.getMonth(), 15));
        }
    };

    const handleOpenCal = (btnEl: HTMLElement, e: React.MouseEvent) => {
        e.stopPropagation();
        if (calendarOpen) {
            closeAllCals();
            return;
        }
        const rect = btnEl.getBoundingClientRect();
        const container = document.getElementById('wrapper');
        const containerRect = container ? container.getBoundingClientRect() : { top: 0, left: 0 };
        let top = rect.bottom - containerRect.top + 6;
        let left = rect.left - containerRect.left - 230;
        if (left < 0) left = rect.left - containerRect.left;

        setCalendarPosition({ top, left });
        setCalendarOpen(true);
    };

    useEffect(() => {
        const handleOutsideClick = () => {
            closeAllCals();
        };
        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, []);

    const [mlInsights, setMlInsights] = useState<Record<string, any>>({});
    const [expandedDescMap, setExpandedDescMap] = useState<Record<string, boolean>>({});

    // Global progress computed from real campaign data
    const globalStats = useMemo(() => {
        if (!campaigns.length) return { percentage: 0, executed: 0, total: 0 };
        const total = campaigns.reduce((s, c: any) => s + (c.nb_test_cases || 0), 0);
        const executed = campaigns.reduce((s, c: any) => s + (c.passed_count || 0) + (c.failed_count || 0), 0);
        const percentage = total > 0 ? Math.round((executed / total) * 100) : 0;
        return { percentage, executed, total };
    }, [campaigns]);

    const deadlineCount = useMemo(
        () => campaigns.filter((c: any) => getCampaignEnrichedData(c, mlInsights[c.id]).deadline_today).length,
        [campaigns, mlInsights]
    );
    const retardCount = useMemo(
        () => campaigns.filter((c: any) => getCampaignEnrichedData(c, mlInsights[c.id]).retard > 0).length,
        [campaigns, mlInsights]
    );
    const [stats, setStats] = useState({
        totalTests: 0,
        openAnomalies: 0,
        avgCompletion: 0
    });

    const [testCaseForm, setTestCaseForm] = useState({
        test_case_ref: '',
        status: 'PASSED',
        anomaly_title: '',
        anomaly_description: '',
        anomaly_impact: 'MINEURS',
        anomaly_priority: 'NORMALE',
        anomaly_visibility: 'PUBLIQUE',
        anomaly_file: null as File | null,
        executionType: 'ai' as 'manual' | 'ai',
        manualData: '',
        code: ''
    });
    const [generatingCode, setGeneratingCode] = useState(false);
    const [executingCode, setExecutingCode] = useState(false);
    const [executionResult, setExecutionResult] = useState<{ status: string; logs: string; anomaly_id?: string } | null>(null);
    const [liveLogs, setLiveLogs] = useState<string>('');
    const [showExecModal, setShowExecModal] = useState(false);
    const logsEndRef = React.useRef<HTMLDivElement>(null);

    // ── DEBUG: track state changes ───────────────────────────────────────────
    useEffect(() => {
        console.log(`[EXEC DEBUG] executingCode changed → ${executingCode}`);
        console.log(`[EXEC DEBUG] validationModal.isOpen = ${validationModal.isOpen} (must stay true during execution)`);
    }, [executingCode]);

    useEffect(() => {
        console.log(`[EXEC DEBUG] executionResult changed →`, executionResult);
        console.log(`[EXEC DEBUG] portal condition = ${executingCode || executionResult !== null}`);
    }, [executionResult]);

    useEffect(() => {
        if (liveLogs) {
            console.log(`[EXEC DEBUG] liveLogs updated, length=${liveLogs.length}, preview="${liveLogs.slice(0, 80)}"`);
        }
    }, [liveLogs]);
    // ────────────────────────────────────────────────────────────────────────

    // Auto-scroll logs to bottom
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
        }
    }, [liveLogs]);

    const handleCloseExecModal = () => {
        setShowExecModal(false);
        setExecutionResult(null);
        setLiveLogs('');
        setValidationModal({ isOpen: false, campaign: null });
        setIsValidationOpen(false);
        setValidationMode(null);
    };

    const handleViewAnomaly = (anomalyId?: number) => {
        const id = anomalyId ?? executionResult?.anomaly_id;
        setExecutionResult(null);
        setLiveLogs('');
        setValidationModal({ isOpen: false, campaign: null });
        navigate('/anomalies', { state: { openAnomalyId: id } });
    };

    useEffect(() => {
        if (user) {
            setCurrentPage(1);
            fetchAssignedCampaigns(1);
        }
    }, [user, searchQuery, sortOrder, releaseTypeFilter]);

    const fetchAssignedCampaigns = async (page = 1) => {
        try {
            setLoading(true);
            const response = await campaignService.getCampaigns({
                page,
                search: searchQuery,
                ordering: sortOrder === 'newest' ? '-created_at' : 'created_at',
                release_type: releaseTypeFilter
            });
            const responseData = response.data || {};
            const data = (responseData.results || (Array.isArray(responseData) ? responseData : []));
            const count = responseData.count || (Array.isArray(data) ? data.length : 0);
            setTotalItems(count);
            setCampaigns(data);

            // Calculate total tests planned & passed
            const total = Array.isArray(data) ? data.reduce((sum: number, c: any) => sum + (c.nb_test_cases || 0), 0) : 0;
            const totalPassed = Array.isArray(data) ? data.reduce((sum: number, c: any) => sum + (c.passed_count || 0), 0) : 0;
            const avgCompletion = total > 0 ? Math.round((totalPassed / total) * 100) : 0;

            // Fetch Anomalies for the user
            try {
                const anomaliesRes = await anomalyService.getAnomalies();
                const anomData = anomaliesRes.data.results || anomaliesRes.data;
                const openAnom = anomData.filter((a: any) => a.statut !== 'REALISE').length;
                setStats(prev => ({ ...prev, totalTests: total, openAnomalies: openAnom, avgCompletion }));
            } catch (err) {
                console.error("Failed to fetch anomalies for stats", err);
                setStats(prev => ({ ...prev, totalTests: total, avgCompletion }));
            }

            // Fetch AI data for each campaign (ML Insights only)
            const campaignIds = data.map((c: any) => c.id);
            if (campaignIds.length > 0) {
                // ML Insights (Timeline Guard)
                Promise.all(campaignIds.map((id: any) => aiService.getTimelineGuard(id).catch(() => null)))
                    .then(results => {
                        const mlMap: Record<string, any> = {};
                        results.forEach((res, i) => {
                            if (res) mlMap[campaignIds[i]] = res.data;
                        });
                        setMlInsights(prev => ({ ...prev, ...mlMap }));
                    }).catch(err => console.error("Error fetching ML insights", err));
            }
        } catch (error) {
            console.error("Failed to fetch campaigns", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchAssignedCampaigns(page);
    };

    const filteredCampaigns = useMemo(() => {
        let list = campaigns || [];
        if (filterType === 'deadline') {
            list = list.filter(c => getCampaignEnrichedData(c, mlInsights[c.id]).deadline_today);
        } else if (filterType === 'retard') {
            list = list.filter(c => getCampaignEnrichedData(c, mlInsights[c.id]).retard > 0);
        }
        return list;
    }, [campaigns, filterType, mlInsights]);

    const groupedCampaigns = filteredCampaigns.reduce((acc, camp) => {
        if (groupMode === 'none') return acc;

        let key = '';
        if (groupMode === 'project') {
            key = camp.business_project_name || t('common.globalProject');
        } else {
            const businessProject = camp.business_project_name || t('common.globalProject');
            const releaseName = camp.project_name || t('common.noRelease');
            key = `${businessProject} > ${releaseName}`;
        }

        if (!acc[key]) acc[key] = [];
        acc[key].push(camp);
        return acc;
    }, {} as Record<string, any[]>);

    const handleOpenValidation = (campaign: any) => {
        const enriched = getCampaignEnrichedData(campaign, mlInsights[campaign.id]);
        setValidationModal({ isOpen: true, campaign: { ...campaign, ...enriched } });
        setTestCaseForm({
            test_case_ref: '',
            status: 'PASSED',
            anomaly_title: '',
            anomaly_description: '',
            anomaly_impact: 'MINEURS',
            anomaly_priority: 'NORMALE',
            anomaly_visibility: 'PUBLIQUE',
            anomaly_file: null,
            executionType: 'ai',
            manualData: '',
            code: ''
        });
    };

    const handleGenerateScript = async () => {
        if (!testCaseForm.test_case_ref || !testCaseForm.manualData) {
            toast.error("Veuillez saisir la référence et les étapes du test.");
            return;
        }
        setGeneratingCode(true);
        try {
            const res = await executionService.generateScriptStandalone({
                title: testCaseForm.test_case_ref,
                manual_data: testCaseForm.manualData
            });
            setTestCaseForm(prev => ({ ...prev, code: res.data.code }));
            toast.success("Code généré avec succès");
        } catch (error: any) {
            const data = error?.response?.data;
            if (data?.error === 'quota_exceeded') {
                toast.error(data.message, { autoClose: 8000 });
            } else {
                toast.error("Erreur lors de la génération du code IA. Vérifiez les clés API.");
            }
        } finally {
            setGeneratingCode(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const campaignToValidate = validationModal.campaign || activeDetailCampaign;
        if (!campaignToValidate || !user) return;

        if (testCaseForm.executionType === 'ai') {
            if (!testCaseForm.code) {
                toast.error("Veuillez d'abord générer le code Playwright.");
                return;
            }
            console.log('[EXEC DEBUG] handleSubmit: AI execution starting');
            setExecutingCode(true);
            setLiveLogs('');
            setExecutionResult(null);
            // Keep ValidateCasDeTest open — it will switch to execution log view automatically

            let pollInterval: ReturnType<typeof setInterval> | null = null;

            try {
                // 1. Create TestCase with status PENDING
                const executionData = new FormData();
                executionData.append('campaign', campaignToValidate.id);
                executionData.append('test_case_ref', testCaseForm.test_case_ref);
                executionData.append('status', 'PASSED');
                executionData.append('tester', user.id.toString());
                executionData.append('data_json', JSON.stringify({ manualData: testCaseForm.manualData }));

                const execResponse = await executionService.createExecution(executionData);
                const testId = execResponse.data.id;
                console.log(`[EXEC DEBUG] TestCase created, id=${testId}`);

                // 2. Save script
                await executionService.saveScript(testId, testCaseForm.code);
                console.log(`[EXEC DEBUG] Script saved for testId=${testId}`);

                // 3. Kick off execution — returns IMMEDIATELY (async backend thread)
                await executionService.executeScript(testId);
                console.log(`[EXEC DEBUG] executeScript returned (async thread started on backend)`);

                // 4. Poll live-logs until running=false (execution done)
                //    Guard against concurrent requests to avoid saturating HTTP connections
                let isPolling = false;
                await new Promise<void>((resolve) => {
                    let pollCount = 0;
                    pollInterval = setInterval(async () => {
                        if (isPolling) return;
                        isPolling = true;
                        pollCount++;
                        try {
                            const res = await executionService.getLiveLogs(testId);
                            console.log(`[EXEC DEBUG] poll #${pollCount}: running=${res.data.running}, logLen=${res.data.logs?.length ?? 0}, status=${res.data.status ?? '—'}`);
                            if (res.data.logs) {
                                setLiveLogs(res.data.logs);
                            }
                            // Execution finished when running === false
                            if (res.data.running === false) {
                                const finalStatus = res.data.status || 'FAILED';
                                console.log(`[EXEC DEBUG] Execution DONE → status=${finalStatus}, anomaly_id=${res.data.anomaly_id}`);
                                if (finalStatus === 'FAILED') {
                                    toast.warning('Test échoué. Une anomalie a été déclarée automatiquement.');
                                } else {
                                    toast.success('Test réussi !');
                                }
                                setExecutionResult({
                                    status: finalStatus,
                                    logs: res.data.logs,
                                    anomaly_id: res.data.anomaly_id,
                                });
                                fetchAssignedCampaigns(currentPage);
                                resolve();
                            }
                        } catch (err) {
                            console.error(`[EXEC DEBUG] poll #${pollCount} error:`, err);
                        } finally {
                            isPolling = false;
                        }
                    }, 1500);
                });
            } catch (error) {
                console.error("AI Execution failed", error);
                toast.error("Erreur lors de l'exécution automatique");
            } finally {
                if (pollInterval) clearInterval(pollInterval);
                setExecutingCode(false);
            }
            return;
        }

        try {
            const campaignToValidate = validationModal.campaign || activeDetailCampaign;
            const executionData = new FormData();
            executionData.append('campaign', campaignToValidate.id);
            executionData.append('test_case_ref', testCaseForm.test_case_ref);
            executionData.append('status', testCaseForm.status);
            executionData.append('tester', user.id.toString());
            executionData.append('data_json', JSON.stringify({ manual: true }));

            if (testCaseForm.anomaly_file) {
                executionData.append('proof_file', testCaseForm.anomaly_file);
            }

            const execResponse = await executionService.createExecution(executionData);

            if (testCaseForm.status === 'FAILED') {
                const anomalyData = new FormData();
                anomalyData.append('test_case', execResponse.data.id);
                anomalyData.append('titre', testCaseForm.anomaly_title);
                anomalyData.append('description', testCaseForm.anomaly_description);
                anomalyData.append('impact', testCaseForm.anomaly_impact);
                anomalyData.append('priorite', testCaseForm.anomaly_priority);
                anomalyData.append('visibilite', testCaseForm.anomaly_visibility);
                anomalyData.append('cree_par', user.id.toString());
                if (testCaseForm.anomaly_file) {
                    anomalyData.append('preuve_image', testCaseForm.anomaly_file);
                }
                const anomalyRes = await anomalyService.createAnomaly(anomalyData);
                toast.warning(t('testerDashboard.toasts.anomalyReported'));

                setExecutionResult({
                    status: 'FAILED',
                    logs: 'Exécution manuelle échouée. L\'anomalie a été déclarée avec succès dans le système.',
                    anomaly_id: anomalyRes.data?.id || anomalyRes.data?.anomaly_id
                });
            } else {
                toast.success(t('testerDashboard.toasts.testValidated'));
                setValidationModal({ isOpen: false, campaign: null });
            }

            setValidationModal({ isOpen: false, campaign: null });
            fetchAssignedCampaigns(currentPage);
        } catch (error) {
            console.error("Submission failed", error);
            let errMsg = t('testerDashboard.toasts.validationError');
            const axiosError = error as any;
            if (axiosError.response?.data) {
                const data = axiosError.response.data;
                if (data.proof_file) {
                    errMsg = Array.isArray(data.proof_file) ? data.proof_file[0] : data.proof_file;
                } else if (data.preuve_image) {
                    errMsg = Array.isArray(data.preuve_image) ? data.preuve_image[0] : data.preuve_image;
                } else if (data.non_field_errors) {
                    errMsg = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
                } else if (data.detail) {
                    errMsg = data.detail;
                } else if (typeof data === 'object') {
                    const keys = Object.keys(data);
                    if (keys.length > 0) {
                        const val = data[keys[0]];
                        errMsg = Array.isArray(val) ? val[0] : String(val);
                    }
                }
            }
            toast.error(errMsg);
        }
    };

    const handleOpenExcel = (url: string) => {
        if (!url) {
            toast.error(t('testerDashboard.toasts.fileNotFound'));
            return;
        }
        let link = url;
        if (url.includes('/media/')) {
            link = url.substring(url.indexOf('/media/'));
        }
        window.open(link, '_blank');
    };



    const getMLStatusStyle = (status: string) => {
        switch (status) {
            case 'CRITICAL': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            case 'WARNING': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'OPTIMAL': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    const renderCampaignCard = (camp: any) => {
        const enriched = getCampaignEnrichedData(camp, mlInsights[camp.id]);
        const isActive = activeDetailCampaign?.id === camp.id;
        const progressPercentage = enriched.percentage;

        const isRecette = enriched.release_type.toUpperCase() === 'RECETTE';
        const isPreprod = enriched.release_type.toUpperCase() === 'PREPROD';

        return (
            <motion.div
                key={camp.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                    setActiveDetailCampaign(camp);
                    const enrichedDates = getCampaignEnrichedData(camp, mlInsights[camp.id]);
                    setCalendarCurrentDate(new Date(enrichedDates.debut.getFullYear(), enrichedDates.debut.getMonth(), 15));
                }}
                className={`group relative overflow-hidden transition-all duration-300 flex flex-col h-full cursor-pointer select-none`}
                style={{
                    background: isActive ? '#131e30' : '#111827',
                    borderRadius: '12px',
                    border: isActive ? '0.5px solid rgba(55,138,221,0.4)' : '0.5px solid rgba(255,255,255,0.08)',
                    padding: '14px'
                }}
            >
                {/* Ligne top : badges à gauche + pourcentage en vert #1D9E75 17px à droite */}
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-1.5">
                        {isRecette && (
                            <span
                                className="px-2 py-0.5 rounded-[4px] text-[9px] font-semibold tracking-wider"
                                style={{
                                    background: 'rgba(255,255,255,0.07)',
                                    color: 'rgba(255,255,255,0.45)',
                                    border: '0.5px solid rgba(255,255,255,0.12)'
                                }}
                            >
                                RECETTE
                            </span>
                        )}
                        {isPreprod && (
                            <span
                                className="px-2 py-0.5 rounded-[4px] text-[9px] font-semibold tracking-wider"
                                style={{
                                    background: 'rgba(29,158,117,0.15)',
                                    color: '#5DCAA5',
                                    border: '0.5px solid rgba(29,158,117,0.25)'
                                }}
                            >
                                PREPROD
                            </span>
                        )}
                        <span
                            className="px-2 py-0.5 rounded-[4px] text-[9px] font-semibold tracking-wider"
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                color: 'rgba(255,255,255,0.35)',
                                border: '0.5px solid rgba(255,255,255,0.09)'
                            }}
                        >
                            {enriched.nb_test_cases} test{enriched.nb_test_cases > 1 ? 's' : ''}
                        </span>
                    </div>
                    <span
                        className="text-[17px] font-bold"
                        style={{ color: '#1D9E75' }}
                    >
                        {progressPercentage}%
                    </span>
                </div>

                {/* Titre en 13px blanc 500 */}
                <h3 className="text-[13px] font-medium text-white mb-1.5 leading-snug line-clamp-2">
                    {camp.title}
                </h3>

                {/* Date de création avec icône calendrier, 10px muted */}
                <div className="flex items-center justify-between text-[10px] text-white/40 mb-3">
                    <div className="flex items-center gap-1">
                        <Calendar size={11} className="shrink-0" />
                        <span>Créé le {new Date(camp.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {enriched.manager && (
                        <div className="flex items-center gap-1 text-white/50 bg-white/5 px-1.5 py-0.5 rounded border border-white/[0.04]">
                            <User size={9} className="shrink-0" />
                            <span>Par {enriched.manager}</span>
                        </div>
                    )}
                </div>

                {/* Description tronquée à 2 lignes ou placeholder italic muted si vide */}
                <div className="mb-4">
                    {camp.description ? (
                        <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2">
                            {camp.description}
                        </p>
                    ) : (
                        <p className="text-[11px] text-white/30 italic">
                            Aucune description.
                        </p>
                    )}
                </div>

                {/* Barre de progression 3px verte + métadonnée "X/Y tests" à gauche + badge "Terminé" vert pill à droite */}
                <div className="mt-auto space-y-2">
                    <div className="h-[3px] w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${progressPercentage}%`,
                                backgroundColor: '#1D9E75'
                            }}
                        />
                    </div>

                    <div className="flex justify-between items-center text-[10px]">
                        <span className="text-white/40 font-medium">
                            {enriched.passed_count + enriched.failed_count}/{enriched.nb_test_cases} validés
                        </span>
                        {enriched.restants === 0 && (
                            enriched.failed_count === 0 ? (
                                <span
                                    className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider"
                                    style={{
                                        background: 'rgba(29,158,117,0.15)',
                                        color: '#5DCAA5',
                                        border: '0.5px solid rgba(29,158,117,0.25)'
                                    }}
                                >
                                    Terminé
                                </span>
                            ) : (
                                <span
                                    className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider"
                                    style={{
                                        background: 'rgba(239,68,68,0.15)',
                                        color: '#F09595',
                                        border: '0.5px solid rgba(239,68,68,0.25)'
                                    }}
                                >
                                    Anomalies
                                </span>
                            )
                        )}
                    </div>
                </div>

                {/* Chip retard ambré OU chip deadline rouge — uniquement si applicable */}
                {(enriched.retard > 0 || enriched.deadline_today) && (
                    <div className="mt-3">
                        {enriched.retard > 0 ? (
                            <div
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[10px] font-semibold"
                                style={{
                                    background: 'rgba(245,158,11,0.12)',
                                    color: '#F59E0B',
                                    border: '0.5px solid rgba(245,158,11,0.25)'
                                }}
                            >
                                <Clock size={11} className="shrink-0" />
                                <span>Retard de {enriched.retard} jours</span>
                            </div>
                        ) : (
                            <div
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[10px] font-semibold"
                                style={{
                                    background: 'rgba(239,68,68,0.12)',
                                    color: '#EF4444',
                                    border: '0.5px solid rgba(239,68,68,0.25)'
                                }}
                            >
                                <AlertTriangle size={11} className="shrink-0" />
                                <span>Deadline aujourd'hui</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Hint discret "Voir détails" en 10px bleu rgba(55,138,221,0.6) avec icône sidebar-right */}
                <div
                    className="mt-3.5 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-medium transition-colors"
                    style={{ color: 'rgba(55,138,221,0.8)' }}
                >
                    <span>Voir détails</span>
                    <Sidebar size={12} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </div>
            </motion.div>
        );
    };

    const openValidation = () => {
        setIsValidationOpen(true);
        setTimeout(() => {
            document.getElementById('validation-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const selectMode = (mode: 'ia' | 'manual') => {
        setValidationMode(mode);
        setTestCaseForm(prev => ({ ...prev, executionType: mode === 'ia' ? 'ai' : 'manual' }));
        setTimeout(() => {
            document.getElementById('validation-form-container')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const closeForm = () => {
        setIsValidationOpen(false);
        setValidationMode(null);
        setExecutionResult(null);
        setTestCaseForm(prev => ({
            ...prev,
            test_case_ref: '',
            status: 'PASSED',
            anomaly_title: '',
            anomaly_description: '',
            anomaly_file: null,
            manualData: '',
            code: ''
        }));
    };

    const selectStatus = (status: 'success' | 'fail') => {
        setTestCaseForm(prev => ({ ...prev, status: status === 'success' ? 'PASSED' : 'FAILED' }));
    };

    const renderCampaignDetailsPage = (camp: any) => {
        const enriched = getCampaignEnrichedData(camp, mlInsights[camp.id]);
        const progressPercentage = enriched.percentage;

        const isRecette = enriched.release_type.toUpperCase() === 'RECETTE';
        const isPreprod = enriched.release_type.toUpperCase() === 'PREPROD';

        return (
            <div className="space-y-6 text-slate-100 max-w-5xl mx-auto w-full">
                {/* Header de page */}
                <div className="space-y-4 pb-2">
                    <button
                        onClick={() => {
                            setActiveDetailCampaign(null);
                            setExecutionResult(null);
                            closeForm();
                        }}
                        className="text-xs text-white/50 hover:text-white transition-colors flex items-center gap-1 font-bold"
                    >
                        ← Mon Espace
                    </button>
                    <div className="text-[10px] text-white/40 flex items-center gap-1 font-medium -mt-2">
                        <span>version 1.0</span>
                        <span>›</span>
                        <span>{camp.business_project_name || camp.project_name || 'projet2'}</span>
                        <span>›</span>
                        <span className="text-[#85B7EB]">Détail campagne</span>
                    </div>

                    {/* Campaign Detail Header Card */}
                    <div
                        style={{ background: '#111827', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.08)', padding: '20px 24px' }}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                        <div className="space-y-3">
                            <h2 className="text-2xl font-bold text-white leading-none">{camp.title}</h2>
                            <div className="flex items-center gap-2 flex-wrap">
                                {isRecette && (
                                    <span style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '0.5px solid rgba(255,255,255,0.1)' }} className="px-3 py-1 rounded-[12px] text-[9px] font-bold uppercase tracking-wider">Recette</span>
                                )}
                                {isPreprod && (
                                    <span style={{ background: 'rgba(29,158,117,0.15)', color: '#5DCAA5', border: '0.5px solid rgba(29,158,117,0.25)' }} className="px-3 py-1 rounded-[12px] text-[9px] font-bold uppercase tracking-wider">Preprod</span>
                                )}
                                <span style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '0.5px solid rgba(255,255,255,0.1)' }} className="px-3 py-1 rounded-[12px] text-[9px] font-bold uppercase tracking-wider">
                                    {enriched.nb_test_cases} test{enriched.nb_test_cases > 1 ? 's' : ''}
                                </span>
                                {enriched.restants === 0 && (
                                    enriched.failed_count === 0 ? (
                                        <span style={{ background: 'rgba(29,158,117,0.15)', color: '#5DCAA5', border: '0.5px solid rgba(29,158,117,0.25)' }} className="px-3 py-1 rounded-[12px] text-[9px] font-bold uppercase tracking-wider">Terminé</span>
                                    ) : (
                                        <span style={{ background: 'rgba(239,68,68,0.15)', color: '#F09595', border: '0.5px solid rgba(239,68,68,0.25)' }} className="px-3 py-1 rounded-[12px] text-[9px] font-bold uppercase tracking-wider">Anomalies</span>
                                    )
                                )}
                                <span style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '0.5px solid rgba(255,255,255,0.1)' }} className="px-3 py-1 rounded-[12px] text-[9px] font-bold uppercase tracking-wider">
                                    Créé par {enriched.manager}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end">
                                {/* Small progress bar */}
                                <div className="h-[4px] w-36 bg-white/10 rounded-full overflow-hidden mb-1.5">
                                    <div className="h-full bg-[#1D9E75] rounded-full" style={{ width: `${progressPercentage}%` }} />
                                </div>
                                {/* Counter */}
                                <span className="text-[10px] text-white/40 font-bold tracking-wider">
                                    {enriched.passed_count + enriched.failed_count} / {enriched.nb_test_cases} validés
                                </span>
                            </div>
                            {/* Big percentage */}
                            <span className="text-[32px] font-black text-[#1D9E75] leading-none shrink-0">{progressPercentage}%</span>
                        </div>
                    </div>
                </div>

                <hr className="border-white/[0.08] mb-6" />

                {/* Métriques */}
                <div
                    style={{ background: '#111827', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.08)' }}
                    className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]"
                >
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div>
                            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Réussis</span>
                            <span className="text-xl font-bold text-[#1D9E75] mt-0.5 block">{enriched.passed_count}</span>
                        </div>
                        <div className="w-12 h-[3px] bg-white/5 rounded-full overflow-hidden shrink-0">
                            <div className="h-full bg-[#1D9E75] rounded-full" style={{ width: `${(enriched.passed_count / (enriched.nb_test_cases || 1)) * 100}%` }} />
                        </div>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div>
                            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Anomalies</span>
                            <span className="text-xl font-bold text-[#F09595] mt-0.5 block">{enriched.anomalies_count}</span>
                        </div>
                        <div className="w-12 h-[3px] bg-white/5 rounded-full overflow-hidden shrink-0">
                            <div className="h-full bg-[#F09595] rounded-full" style={{ width: `${enriched.anomalies_count > 0 ? 100 : 0}%` }} />
                        </div>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div>
                            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Test/jour</span>
                            <span className="text-xl font-bold text-[#85B7EB] mt-0.5 block">{enriched.velocity}</span>
                        </div>
                        <div className="w-12 h-[3px] bg-white/5 rounded-full overflow-hidden shrink-0">
                            {(() => {
                                const durationDays = Math.max(1, Math.ceil((enriched.echeance.getTime() - enriched.debut.getTime()) / 86_400_000));
                                const dailyGoal = Math.max(1, Math.ceil(enriched.nb_test_cases / durationDays));
                                const velocityPct = Math.min(100, Math.round((enriched.velocity / dailyGoal) * 100));
                                return <div className="h-full bg-[#85B7EB] rounded-full" style={{ width: `${velocityPct}%` }} />;
                            })()}
                        </div>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div>
                            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Restants</span>
                            <span className="text-xl font-bold text-white/80 mt-0.5 block">{enriched.restants}</span>
                        </div>
                        <div className="w-12 h-[3px] bg-white/5 rounded-full overflow-hidden shrink-0">
                            <div className="h-full bg-white/20 rounded-full" style={{ width: `${(enriched.restants / (enriched.nb_test_cases || 1)) * 100}%` }} />
                        </div>
                    </div>
                </div>

                {/* Calendrier et Validation side-by-side layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-5xl mx-auto w-full pt-4">
                    {/* Colonne Gauche — Calendrier */}
                    <div className="lg:col-span-5 flex justify-center w-full">
                        <div
                            style={{ background: '#111827', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.08)', padding: '16px 20px', width: '100%' }}
                            className="space-y-4 animate-fadeIn"
                        >
                            {(() => {
                                const currentYear = calendarCurrentDate.getFullYear();
                                const currentMonth = calendarCurrentDate.getMonth();
                                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                                const startOffset = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;

                                const monthNames = [
                                    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
                                ];

                                const days = [];
                                for (let i = 0; i < startOffset; i++) {
                                    days.push(null);
                                }
                                for (let i = 1; i <= daysInMonth; i++) {
                                    days.push(i);
                                }

                                const handlePrevMonth = (e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    setCalendarCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 15));
                                };

                                const handleNextMonth = (e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    setCalendarCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 15));
                                };

                                const isFinIaTooFar = enriched.fin_ia.getFullYear() > currentYear ||
                                    (enriched.fin_ia.getFullYear() === currentYear && enriched.fin_ia.getMonth() > currentMonth);

                                return (
                                    <div className="w-full">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                                                Calendrier
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-white/75">
                                                    {monthNames[currentMonth]} {currentYear}
                                                </span>
                                                <div className="flex gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={handlePrevMonth}
                                                        className="w-[20px] h-[20px] bg-white/5 hover:bg-white/10 rounded-[4px] flex items-center justify-center text-white/60 hover:text-white transition-colors text-[10px]"
                                                    >
                                                        &lt;
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleNextMonth}
                                                        className="w-[20px] h-[20px] bg-white/5 hover:bg-white/10 rounded-[4px] flex items-center justify-center text-white/60 hover:text-white transition-colors text-[10px]"
                                                    >
                                                        &gt;
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Légende interactive avec dates */}
                                        <div className="grid grid-cols-3 gap-2 text-[10px] text-white/45 mb-4 border-b border-white/5 pb-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCalendarCurrentDate(new Date(enriched.debut.getFullYear(), enriched.debut.getMonth(), 15));
                                                    setBlinkingDateType('debut');
                                                    setTimeout(() => setBlinkingDateType(null), 3000);
                                                }}
                                                className="flex flex-col items-center gap-1 hover:text-white transition-colors bg-white/5 p-1.5 rounded-lg border border-white/[0.04]"
                                            >
                                                <div className="flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#378ADD]" />
                                                    <span className="font-bold text-[9px] uppercase tracking-wider">Début</span>
                                                </div>
                                                <span className="text-white/75 font-semibold text-[10px]">
                                                    {enriched.debut.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCalendarCurrentDate(new Date(enriched.echeance.getFullYear(), enriched.echeance.getMonth(), 15));
                                                    setBlinkingDateType('echeance');
                                                    setTimeout(() => setBlinkingDateType(null), 3000);
                                                }}
                                                className="flex flex-col items-center gap-1 hover:text-white transition-colors bg-white/5 p-1.5 rounded-lg border border-white/[0.04]"
                                            >
                                                <div className="flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />
                                                    <span className="font-bold text-[9px] uppercase tracking-wider">Échéance</span>
                                                </div>
                                                <span className="text-[#5DCAA5] font-semibold text-[10px]">
                                                    {enriched.echeance.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCalendarCurrentDate(new Date(enriched.fin_ia.getFullYear(), enriched.fin_ia.getMonth(), 15));
                                                    setBlinkingDateType('fin_ia');
                                                    setTimeout(() => setBlinkingDateType(null), 3000);
                                                }}
                                                className="flex flex-col items-center gap-1 hover:text-white transition-colors bg-white/5 p-1.5 rounded-lg border border-white/[0.04]"
                                            >
                                                <div className="flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#E24B4A]" />
                                                    <span className="font-bold text-[9px] uppercase tracking-wider">Fin estimée</span>
                                                </div>
                                                <span className="text-[#F09595] font-semibold text-[10px]">
                                                    {enriched.fin_ia.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                </span>
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-7 gap-0.5 text-center">
                                            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                                                <span key={i} className="text-[10px] font-bold text-white/30 uppercase py-0.5">
                                                    {d}
                                                </span>
                                            ))}
                                            {days.map((day, idx) => {
                                                if (day === null) {
                                                    return <div key={`empty-${idx}`} />;
                                                }

                                                const date = new Date(currentYear, currentMonth, day);
                                                const isToday = date.toDateString() === new Date().toDateString();

                                                const isDebut = enriched.debut.toDateString() === date.toDateString();
                                                const isEcheance = enriched.echeance.toDateString() === date.toDateString();
                                                const isFinIa = enriched.fin_ia.toDateString() === date.toDateString();
                                                const isPast = date < new Date(new Date().toDateString());

                                                let bgStyle = {};
                                                const hasHighlight = isToday || isEcheance || isFinIa;

                                                const isBlinking =
                                                    (isDebut && blinkingDateType === 'debut') ||
                                                    (isEcheance && blinkingDateType === 'echeance') ||
                                                    (isFinIa && blinkingDateType === 'fin_ia');

                                                if (isToday) {
                                                    bgStyle = { background: 'rgba(55,138,221,0.2)', border: '0.5px solid rgba(55,138,221,0.4)', color: '#85B7EB' };
                                                }
                                                if (isEcheance) {
                                                    bgStyle = { background: 'rgba(29,158,117,0.15)', border: '0.5px solid rgba(29,158,117,0.3)', color: '#5DCAA5' };
                                                }
                                                if (isFinIa) {
                                                    bgStyle = { background: 'rgba(226,75,74,0.12)', border: '0.5px solid rgba(226,75,74,0.3)', color: '#F09595' };
                                                }

                                                return (
                                                    <div
                                                        key={day}
                                                        className={`relative flex items-center justify-center text-[11px] h-7 w-full transition-colors font-medium ${isPast && !isToday && !isEcheance && !isFinIa ? 'opacity-25' : ''}`}
                                                    >
                                                        {hasHighlight ? (
                                                            <div
                                                                style={bgStyle}
                                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isBlinking ? 'animate-pulse ring-2 ring-amber-400 ring-offset-1 ring-offset-[#111827]' : ''}`}
                                                            >
                                                                {day}
                                                            </div>
                                                        ) : (
                                                            <span className={`text-white/70 ${isDebut && isBlinking ? 'text-amber-400 font-bold scale-110 transition-all animate-pulse' : ''}`}>{day}</span>
                                                        )}
                                                        {isDebut && (
                                                            <span className={`w-1 h-1 bg-[#378ADD] rounded-full absolute bottom-0.5 left-1/2 -translate-x-1/2 ${isBlinking ? 'animate-ping duration-300' : ''}`} />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {isFinIaTooFar && (
                                            <div className="mt-3 text-[11px] text-[#F09595]/80 italic border-t border-white/5 pt-2 text-center">
                                                Fin estimée trop lointaine pour s'afficher sur ce mois
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Colonne Droite — Validation */}
                    <div className="lg:col-span-7 w-full">
                        {enriched.restants === 0 && enriched.failed_count === 0 ? (
                            <div
                                style={{ background: '#111827', borderRadius: '12px', border: '0.5px solid rgba(29,158,117,0.3)', padding: '20px' }}
                                className="max-w-[600px] mx-auto w-full text-center space-y-2.5"
                            >
                                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#5DCAA5] flex items-center justify-center mx-auto">
                                    <CheckCircle className="w-6 h-6" />
                                </div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Validation terminée à 100%</h3>
                                <p className="text-xs text-white/40 max-w-sm mx-auto leading-relaxed">
                                    Tous les cas de test ont été exécutés et validés. Il n'y a plus aucun test en attente de validation sur cette campagne.
                                </p>
                            </div>
                        ) : enriched.restants === 0 && enriched.failed_count > 0 ? (
                            <div
                                style={{ background: '#111827', borderRadius: '12px', border: '0.5px solid rgba(240,149,149,0.3)', padding: '20px' }}
                                className="max-w-[600px] mx-auto w-full text-center space-y-2.5"
                            >
                                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-[#F09595] flex items-center justify-center mx-auto">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Validation terminée avec anomalies</h3>
                                <p className="text-xs text-white/40 max-w-sm mx-auto leading-relaxed">
                                    Tous les cas de test ont été exécutés, mais {enriched.failed_count} {enriched.failed_count > 1 ? 'anomalies ont été détectées' : 'anomalie a été détectée'}. En attente de correction et de re-validation.
                                </p>
                            </div>
                        ) : (
                            <div className="hidden" />
                        )}
                        <>
                            {!isValidationOpen && (
                                <div
                                    style={{ background: '#111827', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.08)', padding: '16px' }}
                                    className="flex items-center justify-between max-w-[600px] mx-auto w-full"
                                >
                                    <div>
                                        <h3 className="text-sm font-semibold text-white">Prêt à valider un cas de test ?</h3>
                                        <p className="text-xs text-white/40 mt-1">Générez un script d'automatisation ou enregistrez un résultat manuel</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={openValidation}
                                        style={{ background: '#185FA5', color: '#B5D4F4', border: '0.5px solid #378ADD', borderRadius: '10px', padding: '11px 22px' }}
                                        className="text-xs font-bold transition-all hover:brightness-110"
                                    >
                                        Valider un cas de test
                                    </button>
                                </div>
                            )}

                            {/* Section validation */}
                            {isValidationOpen && (
                                <div id="validation-section" className="space-y-4 max-w-[600px] mx-auto w-full">
                                    {/* Bloc choix du mode */}
                                    <div style={{ background: '#111827', borderRadius: '12px', border: '0.5px solid rgba(55,138,221,0.25)', padding: '20px' }} className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-bold text-white">Comment souhaitez-vous valider ce cas de test ?</h3>
                                            <p className="text-xs text-white/40 mt-0.5">Sélectionnez le mode de validation automatisé ou manuel</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Card Validation par l'IA */}
                                            <div
                                                onClick={() => selectMode('ia')}
                                                style={{
                                                    background: validationMode === 'ia' ? '#131e30' : '#1a2235',
                                                    borderRadius: '10px',
                                                    border: validationMode === 'ia' ? '1px solid #378ADD' : '0.5px solid rgba(255,255,255,0.08)',
                                                    padding: '16px',
                                                    cursor: 'pointer'
                                                }}
                                                className="space-y-2 transition-all"
                                            >
                                                <span className="inline-block px-2 py-0.5 rounded-[4px] text-[9px] font-bold bg-[#185FA5]/15 text-[#85B7EB] border border-[#185FA5]/25">
                                                    Automatisée
                                                </span>
                                                <h4 className="text-xs font-bold text-white">Validation par l'IA</h4>
                                                <p className="text-[11px] text-white/40 leading-relaxed">
                                                    Générez automatiquement un script de test Playwright grâce à l'IA d'après vos étapes rédigées.
                                                </p>
                                            </div>

                                            {/* Card Validation Manuelle */}
                                            <div
                                                onClick={() => selectMode('manual')}
                                                style={{
                                                    background: validationMode === 'manual' ? '#131e30' : '#1a2235',
                                                    borderRadius: '10px',
                                                    border: validationMode === 'manual' ? '1px solid #378ADD' : '0.5px solid rgba(255,255,255,0.08)',
                                                    padding: '16px',
                                                    cursor: 'pointer'
                                                }}
                                                className="space-y-2 transition-all"
                                            >
                                                <span className="inline-block px-2 py-0.5 rounded-[4px] text-[9px] font-bold bg-[rgba(29,158,117,0.15)] text-[#5DCAA5] border border-[rgba(29,158,117,0.25)]">
                                                    Manuelle
                                                </span>
                                                <h4 className="text-xs font-bold text-white">Validation Manuelle</h4>
                                                <p className="text-[11px] text-white/40 leading-relaxed">
                                                    Saisissez les résultats du test manuellement, joignez des captures d'écran et déclarez des anomalies.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Formulaires */}
                                    {/* ── Execution log (shown when AI test is running or done) ── */}
                                    {(executingCode || executionResult !== null) && (
                                        <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
                                            {/* Header */}
                                            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 18px' }} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Terminal className="w-4 h-4 text-blue-400" />
                                                    <span className="text-xs font-black text-white uppercase tracking-widest">Exécution Playwright</span>
                                                    <span className="text-[10px] text-slate-500">— {testCaseForm.test_case_ref}</span>
                                                </div>
                                                {executingCode && (
                                                    <div className="flex items-center gap-2 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">En cours...</span>
                                                    </div>
                                                )}
                                                {!executingCode && executionResult?.status === 'PASSED' && (
                                                    <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Succès</span>
                                                    </div>
                                                )}
                                                {!executingCode && executionResult?.status === 'FAILED' && (
                                                    <div className="flex items-center gap-2 px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full">
                                                        <ShieldAlert className="w-3 h-3 text-rose-400" />
                                                        <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Échec</span>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Terminal */}
                                            <div
                                                ref={logsEndRef}
                                                style={{ fontFamily: 'monospace', fontSize: '10px', lineHeight: '1.6', color: '#86efac', padding: '14px 18px', minHeight: '180px', maxHeight: '320px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#0d1117' }}
                                            >
                                                {executingCode && !liveLogs && (
                                                    <span style={{ color: '#64748b' }} className="animate-pulse">▶ Démarrage du runner Playwright...</span>
                                                )}
                                                {liveLogs || executionResult?.logs || ''}
                                                {executingCode && <span style={{ display: 'inline-block', width: '7px', height: '13px', background: '#4ade80', marginLeft: '2px' }} className="animate-pulse" />}
                                            </div>
                                            {/* Footer */}
                                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '12px 18px' }} className="flex items-center justify-end gap-2">
                                                {executingCode && (
                                                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold mr-auto">
                                                        <Loader className="w-3 h-3 animate-spin" />
                                                        Exécution en cours...
                                                    </div>
                                                )}
                                                {!executingCode && executionResult?.status === 'FAILED' && (
                                                    <p className="text-[10px] text-rose-400/80 mr-auto">
                                                        Une anomalie a été déclarée automatiquement par l'IA.
                                                    </p>
                                                )}
                                                <button
                                                    type="button"
                                                    disabled={executingCode}
                                                    onClick={() => { closeForm(); setExecutionResult(null); setLiveLogs(''); }}
                                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '7px 14px', color: '#94a3b8', fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', opacity: executingCode ? 0.3 : 1 }}
                                                >
                                                    Fermer
                                                </button>
                                                {!executingCode && executionResult?.status === 'FAILED' && executionResult?.anomaly_id && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewAnomaly(executionResult.anomaly_id)}
                                                        style={{ background: '#dc2626', borderRadius: '8px', padding: '7px 14px', color: 'white', fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        Voir l'anomalie
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Formulaire IA / Manuel (caché pendant l'exécution) ── */}
                                    {validationMode && !executingCode && executionResult === null && (
                                        <div id="validation-form-container">
                                            {validationMode === 'ia' ? (
                                                /* Formulaire IA */
                                                <form
                                                    onSubmit={handleSubmit}
                                                    style={{ background: '#111827', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.08)', padding: '20px' }}
                                                    className="space-y-4"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="text-sm font-bold text-white">Validation automatisée par l'IA</h3>
                                                        <button
                                                            type="button"
                                                            onClick={closeForm}
                                                            className="text-[28px] text-white/50 hover:text-white transition-colors leading-none"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>

                                                    {/* Champ Nom du cas de test / Référence */}
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] uppercase tracking-wider text-white/45 font-bold block">Nom du cas de test / Référence</label>
                                                        <input
                                                            required
                                                            type="text"
                                                            value={testCaseForm.test_case_ref}
                                                            onChange={(e) => setTestCaseForm({ ...testCaseForm, test_case_ref: e.target.value })}
                                                            placeholder="Ex: TC-001 Connexion"
                                                            style={{ background: '#1a2235', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '9px', padding: '10px 13px' }}
                                                            className="w-full text-white text-xs outline-none focus:border-blue-500/50 transition-colors font-medium"
                                                        />
                                                    </div>

                                                    {/* textarea Étapes du test */}
                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-white/45 font-bold">
                                                            <span>Étapes du test</span>
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    if (!testCaseForm.manualData || isReformulating) return;
                                                                    setIsReformulating(true);
                                                                    try {
                                                                        const res = await aiService.reformulate(testCaseForm.manualData, false, true);
                                                                        if (res.data?.reformulated_message) {
                                                                            setTestCaseForm({ ...testCaseForm, manualData: res.data.reformulated_message });
                                                                        }
                                                                    } catch (e: any) {
                                                                        const data = e?.response?.data;
                                                                        if (data?.error === 'quota_exceeded') {
                                                                            toast.error(data.message, { autoClose: 8000 });
                                                                        } else {
                                                                            toast.error("Impossible d'améliorer le texte, service IA indisponible.");
                                                                        }
                                                                    } finally {
                                                                        setIsReformulating(false);
                                                                    }
                                                                }}
                                                                disabled={!testCaseForm.manualData || isReformulating}
                                                                className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 disabled:opacity-40"
                                                            >
                                                                Améliorer avec l'IA
                                                            </button>
                                                        </div>
                                                        <textarea
                                                            required
                                                            value={testCaseForm.manualData}
                                                            onChange={(e) => setTestCaseForm({ ...testCaseForm, manualData: e.target.value })}
                                                            placeholder="Saisissez les étapes du test..."
                                                            style={{ background: '#1a2235', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '9px', padding: '10px 13px', height: '90px' }}
                                                            className="w-full text-white text-xs outline-none focus:border-blue-500/50 transition-colors resize-none"
                                                        />
                                                    </div>

                                                    {/* Bouton générer script */}
                                                    {!testCaseForm.code ? (
                                                        <button
                                                            type="button"
                                                            onClick={handleGenerateScript}
                                                            disabled={generatingCode}
                                                            style={{ background: 'rgba(55,138,221,0.08)', border: '0.5px solid rgba(55,138,221,0.2)', color: '#85B7EB' }}
                                                            className="w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                        >
                                                            {generatingCode ? "Génération IA..." : "Générer le script d'automatisation"}
                                                        </button>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-center text-[10px] text-[#85B7EB] font-bold uppercase tracking-wider">
                                                                <span>Code Playwright</span>
                                                                <div className="flex items-center gap-2.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setIsEditing(!isEditing)}
                                                                        className="text-white/40 hover:text-white uppercase text-[9px]"
                                                                    >
                                                                        {isEditing ? 'Valider' : 'Éditer'}
                                                                    </button>
                                                                    <span className="text-white/15 text-[9px]">|</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setIsCodeModalOpen(true)}
                                                                        className="text-white/40 hover:text-white uppercase text-[9px] flex items-center gap-1"
                                                                        title="Agrandir le code"
                                                                    >
                                                                        <Maximize2 className="w-2.5 h-2.5" />
                                                                        Agrandir
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="bg-slate-950 border border-white/5 rounded-lg p-2.5 font-mono text-[9px] leading-relaxed max-h-[140px] overflow-y-auto">
                                                                {isEditing ? (
                                                                    <textarea
                                                                        value={testCaseForm.code}
                                                                        onChange={(e) => setTestCaseForm({ ...testCaseForm, code: e.target.value })}
                                                                        className="w-full h-24 bg-transparent text-white/70 outline-none border-none resize-none"
                                                                    />
                                                                ) : (
                                                                    <pre
                                                                        className="text-white/70 whitespace-pre-wrap font-mono text-[9px]"
                                                                        dangerouslySetInnerHTML={{ __html: highlightPlaywrightCode(testCaseForm.code) }}
                                                                    />
                                                                )}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={handleGenerateScript}
                                                                disabled={generatingCode}
                                                                className="text-[9px] text-[#85B7EB] hover:text-[#85B7EB]/80 flex items-center gap-1 transition-colors"
                                                            >
                                                                Régénérer le script
                                                            </button>
                                                        </div>
                                                    )}

                                                    <hr className="border-white/[0.08]" />

                                                    {/* Execute */}
                                                    <button
                                                        type="submit"
                                                        disabled={executingCode || !testCaseForm.code}
                                                        onClick={(e) => {
                                                            const form = e.currentTarget.form;
                                                            if (form && !form.checkValidity()) {
                                                                form.reportValidity();
                                                                return;
                                                            }
                                                            handleSubmit(e);
                                                        }}
                                                        style={{ background: '#185FA5', color: '#B5D4F4', borderRadius: '10px', padding: '13px' }}
                                                        className="w-full text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        Exécuter & Enregistrer
                                                    </button>
                                                </form>
                                            ) : (
                                                /* Formulaire Manuel */
                                                <form
                                                    onSubmit={handleSubmit}
                                                    style={{ background: '#111827', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.08)', padding: '20px' }}
                                                    className="space-y-4"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="text-sm font-bold text-white">Validation manuelle</h3>
                                                        <button
                                                            type="button"
                                                            onClick={closeForm}
                                                            className="text-[28px] text-white/50 hover:text-white transition-colors leading-none"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>

                                                    {/* Champ Nom du cas de test / Référence */}
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] uppercase tracking-wider text-white/45 font-bold block">Nom du cas de test / Référence</label>
                                                        <input
                                                            required
                                                            type="text"
                                                            value={testCaseForm.test_case_ref}
                                                            onChange={(e) => setTestCaseForm({ ...testCaseForm, test_case_ref: e.target.value })}
                                                            placeholder="Ex: TC-001 Connexion"
                                                            style={{ background: '#1a2235', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '9px', padding: '10px 13px' }}
                                                            className="w-full text-white text-xs outline-none focus:border-blue-500/50 transition-colors font-medium"
                                                        />
                                                    </div>

                                                    {/* Upload Capture */}
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] uppercase tracking-wider text-white/45 font-bold block">Preuve d'exécution / Capture</label>
                                                        <div className="flex items-center gap-2">
                                                            <label
                                                                style={{
                                                                    border: '0.5px dashed rgba(255,255,255,0.15)',
                                                                    background: 'rgba(255,255,255,0.02)',
                                                                    borderRadius: '9px',
                                                                    padding: '10px 13px'
                                                                }}
                                                                className="flex-1 cursor-pointer text-center transition-all hover:bg-white/5"
                                                            >
                                                                <input
                                                                    type="file"
                                                                    accept="image/*, .pdf, .docx"
                                                                    onChange={(e) => {
                                                                        if (e.target.files && e.target.files[0]) {
                                                                            setTestCaseForm({ ...testCaseForm, anomaly_file: e.target.files[0] });
                                                                        }
                                                                    }}
                                                                    className="hidden"
                                                                />
                                                                <span className="text-[10px] text-white/40 block truncate">
                                                                    {testCaseForm.anomaly_file ? testCaseForm.anomaly_file.name : "Cliquez pour ajouter une capture"}
                                                                </span>
                                                            </label>
                                                            {testCaseForm.anomaly_file && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setTestCaseForm({ ...testCaseForm, anomaly_file: null })}
                                                                    style={{ background: '#1a2235', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '9px', padding: '10px' }}
                                                                    className="text-rose-400"
                                                                >
                                                                    ×
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Statut Exécution */}
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] uppercase tracking-wider text-white/45 font-bold block">Statut de l'exécution</label>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => selectStatus('success')}
                                                                style={{
                                                                    background: testCaseForm.status === 'PASSED' ? 'rgba(29,158,117,0.1)' : '#1a2235',
                                                                    color: testCaseForm.status === 'PASSED' ? '#5DCAA5' : 'rgba(255,255,255,0.4)',
                                                                    border: testCaseForm.status === 'PASSED' ? '0.5px solid rgba(29,158,117,0.3)' : '0.5px solid rgba(255,255,255,0.08)',
                                                                    borderRadius: '9px',
                                                                    padding: '10px'
                                                                }}
                                                                className="text-xs font-bold transition-all text-center"
                                                            >
                                                                Succès (Valide)
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => selectStatus('fail')}
                                                                style={{
                                                                    background: testCaseForm.status === 'FAILED' ? 'rgba(226,75,74,0.12)' : '#1a2235',
                                                                    color: testCaseForm.status === 'FAILED' ? '#F09595' : 'rgba(255,255,255,0.4)',
                                                                    border: testCaseForm.status === 'FAILED' ? '0.5px solid rgba(226,75,74,0.35)' : '0.5px solid rgba(255,255,255,0.08)',
                                                                    borderRadius: '9px',
                                                                    padding: '10px'
                                                                }}
                                                                className="text-xs font-bold transition-all text-center"
                                                            >
                                                                Échec (Invalid)
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Bloc Anomalie si Échec */}
                                                    {testCaseForm.status === 'FAILED' && (
                                                        <div
                                                            style={{
                                                                background: 'rgba(226,75,74,0.03)',
                                                                border: '1px solid rgba(226,75,74,0.15)',
                                                                borderRadius: '10px',
                                                                padding: '14px'
                                                            }}
                                                            className="space-y-3"
                                                        >
                                                            <h4 className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Déclaration d'anomalie</h4>

                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] uppercase text-white/40 font-bold block">Titre</label>
                                                                <input
                                                                    type="text"
                                                                    required
                                                                    value={testCaseForm.anomaly_title}
                                                                    onChange={e => setTestCaseForm({ ...testCaseForm, anomaly_title: e.target.value })}
                                                                    placeholder="Titre de l'anomalie"
                                                                    style={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '9px', padding: '8px 11px' }}
                                                                    className="w-full text-white text-xs outline-none focus:border-rose-500/50"
                                                                />
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] uppercase text-white/40 font-bold block">Visibilité</label>
                                                                <select
                                                                    value={testCaseForm.anomaly_visibility}
                                                                    onChange={e => setTestCaseForm({ ...testCaseForm, anomaly_visibility: e.target.value })}
                                                                    style={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '9px', padding: '8px 11px' }}
                                                                    className="w-full text-white text-xs outline-none"
                                                                >
                                                                    <option value="PUBLIQUE" className="bg-slate-900">PUBLIQUE</option>
                                                                    <option value="PRIVEE" className="bg-slate-900">PRIVÉE</option>
                                                                </select>
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] uppercase text-white/40 font-bold block">Description</label>
                                                                <textarea
                                                                    required
                                                                    value={testCaseForm.anomaly_description}
                                                                    onChange={e => setTestCaseForm({ ...testCaseForm, anomaly_description: e.target.value })}
                                                                    placeholder="Description..."
                                                                    style={{ background: '#1a2235', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '9px', padding: '8px 11px' }}
                                                                    className="w-full text-white text-xs outline-none min-h-[60px] resize-none"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <hr className="border-white/[0.08]" />

                                                    {/* Save */}
                                                    <button
                                                        type="submit"
                                                        style={{ background: '#185FA5', color: '#B5D4F4', borderRadius: '10px', padding: '13px' }}
                                                        className="w-full text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                                                    >
                                                        Enregistrer
                                                    </button>
                                                </form>
                                            )}
                                        </div>
                                    )}
                                    {/* ── end formulaire ── */}
                                </div>
                            )}
                        </>
                    </div>
                </div>
            </div>
        );
    };

    if (activeDetailCampaign) {
        return (
            <PageLayout>
                {renderCampaignDetailsPage(activeDetailCampaign)}
            </PageLayout>
        );
    }

    return (
        <>
        <PageLayout
            title={t('testerDashboard.title')}
            subtitle={t('testerDashboard.subtitle')}
        >
            <div className="space-y-12">
                <PendingReinforcements />

                {/* Mon avancement global panel */}
                <div className="bg-[#111827] border border-white/10 rounded-[12px] p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6 w-full md:w-auto flex-1">
                        {/* Left side: dynamic global % */}
                        <div className="text-[42px] font-black text-[#1D9E75] leading-none shrink-0">
                            {globalStats.percentage}%
                        </div>
                        {/* Middle side: Progress bar */}
                        <div className="flex-1 min-w-0 space-y-2">
                            <h3 className="text-sm font-semibold text-white">Mon avancement global</h3>
                            <div className="h-[6px] w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[#1D9E75]" style={{ width: `${globalStats.percentage}%` }} />
                            </div>
                            <div className="text-[11px] text-white/40">
                                <span className="font-semibold text-white/60">{globalStats.executed} / {globalStats.total}</span> tests exécutés sur <span className="font-semibold text-white/60">{campaigns.length} campagne{campaigns.length !== 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right side: Pills */}
                    <div className="flex flex-wrap gap-3 shrink-0">
                        {deadlineCount > 0 && (
                            <button
                                type="button"
                                onClick={() => setFilterType(prev => prev === 'deadline' ? 'all' : 'deadline')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all ${filterType === 'deadline'
                                        ? 'bg-rose-500/25 border-rose-500 text-rose-200 shadow-lg shadow-rose-500/10 scale-[1.02]'
                                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                                    }`}
                            >
                                <Clock size={14} className="shrink-0" />
                                <span>{deadlineCount} deadline{deadlineCount > 1 ? 's' : ''} imminente{deadlineCount > 1 ? 's' : ''}</span>
                            </button>
                        )}

                        {retardCount > 0 && (
                            <button
                                type="button"
                                onClick={() => setFilterType(prev => prev === 'retard' ? 'all' : 'retard')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all ${filterType === 'retard'
                                        ? 'bg-amber-500/25 border-amber-500 text-amber-200 shadow-lg shadow-amber-500/10 scale-[1.02]'
                                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                                    }`}
                            >
                                <AlertTriangle size={14} className="shrink-0" />
                                <span>{retardCount} retard{retardCount > 1 ? 's' : ''} critique{retardCount > 1 ? 's' : ''}</span>
                            </button>
                        )}
                    </div>
                </div>



                <div className="space-y-8">
                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                placeholder={t('testerDashboard.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-6 py-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium placeholder-slate-500"
                            />
                        </div>

                        <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 px-6 rounded-2xl border border-slate-200 dark:border-white/10 min-w-[200px]">
                            <LayoutGrid className="w-4 h-4 text-slate-500" />
                            <select
                                value={groupMode}
                                onChange={(e) => setGroupMode(e.target.value as 'project' | 'release' | 'none')}
                                className="bg-transparent border-none py-4 text-sm font-bold text-slate-900 dark:text-white focus:ring-0 w-full cursor-pointer"
                            >
                                <option value="none" className="bg-white dark:bg-slate-900">{t('testerDashboard.controls.simpleGrid')}</option>
                                <option value="project" className="bg-white dark:bg-slate-900">{t('testerDashboard.controls.groupByProject')}</option>
                                <option value="release" className="bg-white dark:bg-slate-900">{t('testerDashboard.controls.groupByRelease')}</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 px-6 rounded-2xl border border-slate-200 dark:border-white/10 min-w-[200px]">
                            <Layers className="w-4 h-4 text-slate-500" />
                            <select
                                value={releaseTypeFilter}
                                onChange={(e) => setReleaseTypeFilter(e.target.value as 'all' | 'PREPROD' | 'RECETTE')}
                                className="bg-transparent border-none py-4 text-sm font-bold text-slate-900 dark:text-white focus:ring-0 w-full cursor-pointer"
                            >
                                <option value="all" className="bg-white dark:bg-slate-900">Toutes les releases</option>
                                <option value="PREPROD" className="bg-white dark:bg-slate-900">Preprod</option>
                                <option value="RECETTE" className="bg-white dark:bg-slate-900">Recette</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 px-6 rounded-2xl border border-slate-200 dark:border-white/10 min-w-[200px]">
                            <Filter className="w-4 h-4 text-slate-500" />
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                className="bg-transparent border-none py-4 text-sm font-bold text-slate-900 dark:text-white focus:ring-0 w-full cursor-pointer"
                            >
                                <option value="newest" className="bg-white dark:bg-slate-900">{t('testerDashboard.controls.recent')}</option>
                                <option value="oldest" className="bg-white dark:bg-slate-900">{t('testerDashboard.controls.oldest')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-6 items-start relative">
                        <div className="flex-1 min-w-0">
                            {loading ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-[400px] bg-slate-100 dark:bg-white/5 animate-pulse rounded-[2.5rem] border border-slate-200 dark:border-white/10" />
                                    ))}
                                </div>
                            ) : (campaigns || []).length === 0 ? (
                                <div className="text-center py-32 bg-slate-50 dark:bg-white/5 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-white/10">
                                    <List className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4 opacity-50" />
                                    <p className="text-xl font-bold text-slate-400 italic">
                                        {(campaigns || []).length === 0 ? t('testerDashboard.state.emptyAssigned') : t('testerDashboard.state.emptySearch')}
                                    </p>
                                </div>
                            ) : groupMode !== 'none' ? (
                                <div className="space-y-12">
                                    {Object.keys(groupedCampaigns || {}).map(releaseName => (
                                        <div key={releaseName} className="space-y-6">
                                            <div className="flex items-center gap-4">
                                                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase">
                                                    {groupMode === 'project' ? (
                                                        <span className="text-blue-500">{releaseName}</span>
                                                    ) : (
                                                        <>
                                                            <span className="text-slate-500">{releaseName.split(' > ')[0]}</span>
                                                            <ChevronRight className="w-4 h-4 inline-block mx-2 text-slate-700" />
                                                            <span className="text-blue-500">{releaseName.split(' > ')[1]}</span>
                                                        </>
                                                    )}
                                                </h2>
                                                <div className="h-px flex-1 bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
                                                <span className="text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5 uppercase tracking-widest">
                                                    {t('testerDashboard.group.count', { count: groupedCampaigns[releaseName].length })}
                                                </span>
                                            </div>
                                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-300 ${isDrawerOpen ? 'lg:grid-cols-2 has-drawer' : 'lg:grid-cols-3'}`} id="mainGrid">
                                                {(groupedCampaigns[releaseName] || []).map(camp => renderCampaignCard(camp))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-300 ${isDrawerOpen ? 'lg:grid-cols-2 has-drawer' : 'lg:grid-cols-3'}`} id="mainGrid">
                                    {filteredCampaigns.map(camp => renderCampaignCard(camp))}
                                </div>
                            )}

                            <div className="pt-10">
                                <Pagination
                                    currentPage={currentPage}
                                    totalItems={totalItems}
                                    pageSize={pageSize}
                                    onPageChange={handlePageChange}
                                    loading={loading}
                                />
                            </div>
                        </div>

                        {/* Side Drawer Component */}
                        <div
                            id="drawer"
                            className={`shrink-0 transition-all duration-300 overflow-hidden ${isDrawerOpen ? 'w-[260px] border border-[rgba(55,138,221,0.25)] p-4 bg-[#111827] rounded-[12px]' : 'w-0 border-none p-0'}`}
                        >
                            {isDrawerOpen && (() => {
                                const activeCamp = campaigns.find(c => c.id === selectedCampaignId);
                                if (!activeCamp) return null;
                                const activeEnriched = getCampaignEnrichedData(activeCamp, mlInsights[activeCamp.id]);
                                return (
                                    <div className="space-y-4">
                                        {/* Header */}
                                        <div className="flex justify-between items-start gap-4 relative">
                                            <h4 className="text-[13px] font-medium text-white leading-snug pr-6">
                                                {activeCamp.title}
                                            </h4>
                                            <button
                                                onClick={closeDrawer}
                                                className="w-6 h-6 flex items-center justify-center text-white/50 hover:text-white bg-white/5 rounded hover:bg-white/10 shrink-0 absolute top-0 right-0 text-[18px]"
                                            >
                                                ×
                                            </button>
                                        </div>

                                        {/* Badges */}
                                        <div className="flex items-center gap-1.5">
                                            {activeEnriched.release_type.toUpperCase() === 'RECETTE' ? (
                                                <span className="px-2 py-0.5 rounded-[4px] text-[9px] font-semibold bg-white/[0.07] text-white/45 border border-white/12">RECETTE</span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-[4px] text-[9px] font-semibold bg-[rgba(29,158,117,0.15)] text-[#5DCAA5] border border-[rgba(29,158,117,0.25)]">PREPROD</span>
                                            )}
                                            <span className="px-2 py-0.5 rounded-[4px] text-[9px] font-semibold bg-white/[0.05] text-white/35 border border-white/9">
                                                {activeEnriched.nb_test_cases} test{activeEnriched.nb_test_cases > 1 ? 's' : ''}
                                            </span>
                                            <span className="text-[11px] font-bold ml-auto text-[#1D9E75]">{activeEnriched.percentage}%</span>
                                        </div>

                                        <hr className="border-white/[0.06]" />

                                        {/* MÉTRIQUES */}
                                        <div>
                                            <div className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-2">MÉTRIQUES</div>
                                            <div className="grid grid-cols-2 gap-2 bg-[#1a2235] p-2.5 rounded-[8px] text-center">
                                                <div>
                                                    <div className="text-[9px] text-white/40 uppercase font-semibold">Réussis</div>
                                                    <div className="text-[20px] font-bold text-[#1D9E75]">{activeEnriched.passed_count}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-white/40 uppercase font-semibold">Anomalies</div>
                                                    <div className="text-[20px] font-bold text-[#F09595]">{activeEnriched.anomalies_count}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* INFORMATIONS */}
                                        <div>
                                            <div className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-2">INFORMATIONS</div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-[11px]">
                                                    <span className="text-white/35">Manager</span>
                                                    <span className="text-white/75 font-medium">{activeEnriched.manager}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[11px]">
                                                    <span className="text-white/35">Vélocité</span>
                                                    <span className="text-white/75 font-medium">{activeEnriched.velocity} test/jour</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[11px]">
                                                    <span className="text-white/35">Restants</span>
                                                    <span className="text-white/75 font-medium">{activeEnriched.restants} tests</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[11px]">
                                                    <span className="text-white/35">Début</span>
                                                    <span className="text-white/75 font-medium">{activeEnriched.debut.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[11px]">
                                                    <span className="text-white/35">Échéance</span>
                                                    <span className="text-white/75 font-medium">{activeEnriched.echeance.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[11px]">
                                                    <span className="text-white/35">Fin estimée</span>
                                                    <span className="text-white/75 font-medium">{activeEnriched.fin_ia.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* PROGRESSION */}
                                        <div className="space-y-2">
                                            <div className="h-[3px] w-full bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-[#1D9E75]"
                                                    style={{ width: `${activeEnriched.percentage}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="text-white/40">{activeEnriched.passed_count + activeEnriched.failed_count}/{activeEnriched.nb_test_cases} validés</span>
                                                {activeEnriched.restants === 0 && (
                                                    activeEnriched.failed_count === 0 ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-[rgba(29,158,117,0.15)] text-[#5DCAA5] border border-[rgba(29,158,117,0.25)]">Terminé</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-[rgba(239,68,68,0.15)] text-[#F09595] border border-[rgba(239,68,68,0.25)]">Anomalies</span>
                                                    )
                                                )}
                                            </div>
                                        </div>

                                        {/* Delay/deadline chip inside drawer */}
                                        {(activeEnriched.retard > 0 || activeEnriched.deadline_today) && (
                                            <div className="w-full">
                                                {activeEnriched.retard > 0 ? (
                                                    <div className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[10px] font-semibold bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border border-[rgba(245,158,11,0.25)]">
                                                        <Clock size={11} />
                                                        <span>Retard de {activeEnriched.retard} jours</span>
                                                    </div>
                                                ) : (
                                                    <div className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[10px] font-semibold bg-[rgba(239,68,68,0.12)] text-[#EF4444] border border-[rgba(239,68,68,0.25)]">
                                                        <AlertTriangle size={11} />
                                                        <span>Deadline aujourd'hui</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Calendar Popover Trigger button */}
                                        <div className="flex justify-center pt-2">
                                            <button
                                                type="button"
                                                id="calBtn"
                                                onClick={(e) => handleOpenCal(e.currentTarget, e)}
                                                className={`w-7 h-7 flex items-center justify-center text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-[7px] border border-white/10 transition-colors cal-btn ${calendarOpen ? 'active' : ''}`}
                                            >
                                                <Calendar size={14} />
                                            </button>
                                        </div>

                                        <hr className="border-white/[0.06]" />

                                        {/* Actions */}
                                        <div className="space-y-2 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenExcel(activeCamp.excel_file)}
                                                className="w-full py-2 bg-transparent hover:bg-white/5 text-white border border-white/10 rounded-[8px] text-[10px] font-semibold tracking-wider uppercase transition-colors"
                                            >
                                                Excel
                                            </button>
                                            <button
                                                type="button"
                                                disabled={activeEnriched.restants === 0 && activeEnriched.failed_count === 0}
                                                onClick={() => handleOpenValidation(activeCamp)}
                                                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-[8px] text-[10px] font-semibold tracking-wider uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {activeEnriched.restants === 0 && activeEnriched.failed_count === 0 ? "Validé" : "Valider"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Floating Calendar Popover rendered at wrapper root level */}
                    {calendarOpen && (() => {
                        const activeCamp = campaigns.find(c => c.id === selectedCampaignId);
                        if (!activeCamp) return null;
                        const activeEnriched = getCampaignEnrichedData(activeCamp, mlInsights[activeCamp.id]);

                        const currentYear = calendarCurrentDate.getFullYear();
                        const currentMonth = calendarCurrentDate.getMonth();
                        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                        const startOffset = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Monday start offset

                        const monthNames = [
                            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
                        ];

                        const days = [];
                        for (let i = 0; i < startOffset; i++) {
                            days.push(null);
                        }
                        for (let i = 1; i <= daysInMonth; i++) {
                            days.push(i);
                        }

                        const handlePrevMonth = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            setCalendarCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 15));
                        };

                        const handleNextMonth = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            setCalendarCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 15));
                        };

                        const isFinIaTooFar = activeEnriched.fin_ia.getFullYear() > currentYear ||
                            (activeEnriched.fin_ia.getFullYear() === currentYear && activeEnriched.fin_ia.getMonth() > currentMonth);

                        return (
                            <div
                                id="calPopover"
                                onClick={(e) => e.stopPropagation()}
                                className="absolute z-[200] bg-[#111827] rounded-[12px] border border-[rgba(55,138,221,0.3)] p-[14px] w-[260px] shadow-2xl transition-all duration-200"
                                style={{
                                    top: `${calendarPosition.top}px`,
                                    left: `${calendarPosition.left}px`,
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeAllCals();
                                    }}
                                    className="absolute top-2 right-2 text-white/40 hover:text-white text-[14px] font-bold"
                                >
                                    ×
                                </button>

                                {/* Header */}
                                <div className="flex justify-between items-center mb-3.5 mt-1">
                                    <span className="text-[11px] font-medium text-white">
                                        {monthNames[currentMonth]} {currentYear}
                                    </span>
                                    <div className="flex gap-1">
                                        <button
                                            type="button"
                                            onClick={handlePrevMonth}
                                            className="w-[22px] h-[22px] bg-white/5 hover:bg-white/10 rounded-[6px] flex items-center justify-center text-white/60 hover:text-white transition-colors"
                                        >
                                            <ChevronLeft size={12} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleNextMonth}
                                            className="w-[22px] h-[22px] bg-white/5 hover:bg-white/10 rounded-[6px] flex items-center justify-center text-white/60 hover:text-white transition-colors"
                                        >
                                            <ChevronRight size={12} />
                                        </button>
                                    </div>
                                </div>

                                {/* Legend */}
                                <div className="flex flex-wrap gap-2 text-[9px] text-white/40 mb-3.5 border-b border-white/5 pb-2">
                                    <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#378ADD]" />
                                        <span>Début</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />
                                        <span>Échéance</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#E24B4A]" />
                                        <span>Fin estimée</span>
                                    </div>
                                </div>

                                {/* Calendar grid */}
                                <div className="grid grid-cols-7 gap-1 text-center">
                                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                                        <span key={i} className="text-[9px] font-bold text-white/30 uppercase py-1">
                                            {d}
                                        </span>
                                    ))}
                                    {days.map((day, idx) => {
                                        if (day === null) {
                                            return <div key={`empty-${idx}`} />;
                                        }

                                        const date = new Date(currentYear, currentMonth, day);
                                        const isToday = date.toDateString() === new Date().toDateString();

                                        const isDebut = activeEnriched.debut.toDateString() === date.toDateString();
                                        const isEcheance = activeEnriched.echeance.toDateString() === date.toDateString();
                                        const isFinIa = activeEnriched.fin_ia.toDateString() === date.toDateString();
                                        const isPast = date < new Date(new Date().toDateString());

                                        let bgStyle = {};
                                        let colorStyle = 'text-white/70';

                                        if (isToday) {
                                            bgStyle = { background: 'rgba(55,138,221,0.2)' };
                                            colorStyle = 'text-[#85B7EB] font-bold';
                                        }
                                        if (isEcheance) {
                                            bgStyle = { background: 'rgba(29,158,117,0.2)', border: '0.5px solid rgba(29,158,117,0.4)' };
                                            colorStyle = 'text-[#5DCAA5] font-semibold';
                                        }
                                        if (isFinIa) {
                                            bgStyle = { background: 'rgba(226,75,74,0.15)', border: '0.5px solid rgba(226,75,74,0.3)' };
                                            colorStyle = 'text-[#F09595] font-semibold';
                                        }
                                        if (isPast && !isToday && !isEcheance && !isFinIa) {
                                            colorStyle = 'text-white/20';
                                        }

                                        return (
                                            <div
                                                key={day}
                                                className="relative flex items-center justify-center text-[10px] rounded-[6px] aspect-square transition-colors font-medium animate-fade-in"
                                                style={bgStyle}
                                            >
                                                <span className={colorStyle}>{day}</span>
                                                {isDebut && (
                                                    <span
                                                        className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-[4px] h-[4px] rounded-full"
                                                        style={{ backgroundColor: '#378ADD' }}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Warning note */}
                                {isFinIaTooFar && (
                                    <div className="mt-3.5 text-[10px] text-[#F09595]/80 italic border-t border-white/5 pt-2 text-center">
                                        Fin estimée trop lointaine pour s'afficher sur ce mois
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>

                <AnimatePresence>
                    {validationModal.isOpen && (
                        <ValidateCasDeTest
                            isOpen={validationModal.isOpen}
                            onClose={() => {
                                setValidationModal({ isOpen: false, campaign: null });
                                setExecutionResult(null);
                                setLiveLogs('');
                            }}
                            campaign={validationModal.campaign}
                            testCaseForm={testCaseForm}
                            setTestCaseForm={setTestCaseForm}
                            handleGenerateScript={handleGenerateScript}
                            handleSubmit={handleSubmit}
                            executingCode={executingCode}
                            generatingCode={generatingCode}
                            executionResult={executionResult}
                            setExecutionResult={setExecutionResult}
                            liveLogs={liveLogs}
                            onViewAnomaly={handleViewAnomaly}
                        />
                    )}
                    {isCodeModalOpen && (
                        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="bg-[#111827] border border-white/10 rounded-2xl max-w-4xl w-full overflow-hidden flex flex-col shadow-2xl max-h-[85vh]"
                            >
                                {/* Header */}
                                <div className="p-6 pb-4 border-b border-white/[0.08] flex items-center justify-between relative shrink-0">
                                    <div className="flex items-center gap-2">
                                        <Code className="w-5 h-5 text-[#85B7EB]" />
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Agrandir le Code Playwright</h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(!isEditing)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#185FA5]/20 border border-[#378ADD]/30 text-[#85B7EB] hover:bg-[#185FA5]/30 rounded text-xs font-semibold tracking-wider uppercase transition-colors"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                            {isEditing ? 'Valider' : 'Éditer'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsCodeModalOpen(false)}
                                            className="p-1 text-white/50 hover:text-white transition-colors"
                                        >
                                            <X className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6 overflow-y-auto flex-1 bg-slate-950/50">
                                    {isEditing ? (
                                        <textarea
                                            value={testCaseForm.code}
                                            onChange={(e) => setTestCaseForm({ ...testCaseForm, code: e.target.value })}
                                            className="w-full min-h-[400px] h-[50vh] bg-transparent text-white/85 font-mono text-xs leading-relaxed resize-none outline-none border border-white/5 rounded-lg p-4 bg-slate-950 custom-scrollbar"
                                            spellCheck={false}
                                        />
                                    ) : (
                                        <pre
                                            className="text-white/80 whitespace-pre-wrap font-mono text-xs leading-relaxed p-4"
                                            dangerouslySetInnerHTML={{ __html: highlightPlaywrightCode(testCaseForm.code) }}
                                        />
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-4 border-t border-white/[0.08] flex justify-end shrink-0 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsCodeModalOpen(false)}
                                        className="px-5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
                                    >
                                        Fermer
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>


            </div>
        </PageLayout>

        </>
    );
};

export default TesterDashboard;
