import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity, Shield, Server, Cpu, TrendingUp, AlertTriangle,
  CheckCircle2, Clock, GitCommit, GitPullRequest, Terminal,
  ChevronRight, ArrowUpRight, ArrowDownRight, Minus, LayoutDashboard,
  GitMerge, Play, Loader2, Github, Gitlab, Box, MessageSquare, Send, Cloud, Hexagon,
  Settings, Key, X, Check, AlertCircle, Wrench, Bell, Radio, Eye, Zap, BarChart3, Code, Brain, Code2, DollarSign, Users, TrendingDown
} from 'lucide-react';
import {
  sreMaturityData, iacSkillsData, doraMetricsData,
  aiRoiData, remediationRoadmap, doraTrendData
} from './data';
import { cn } from './utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import Markdown from 'react-markdown';
import { BackgroundScanBar } from './BackgroundScanBar';
import { useScanContext } from './ScanContext';
import { RAGTrainingPanel } from './RAGTrainingPanel';

// --- Components ---

const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-[#111111] border border-white/10 rounded-xl p-6", className)} {...props}>
    {children}
  </div>
);

const MetricBadge = ({ band }: { band: string }) => {
  const colors: Record<string, string> = {
    'Elite': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'Advanced': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'High': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Maturing': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Medium': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Developing': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Low': 'bg-red-500/10 text-red-400 border-red-500/20',
    'Beginner': 'bg-red-500/10 text-red-400 border-red-500/20',
    'Minimal': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  };
  return (
    <span className={cn("px-2 py-1 rounded text-xs font-medium border", colors[band] || colors['Medium'])}>
      {band}
    </span>
  );
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'Up') return <ArrowUpRight className="w-4 h-4 text-emerald-400" />;
  if (trend === 'Down') return <ArrowDownRight className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-zinc-500" />;
};

// --- Views ---

const AgentChatView = ({ user }: { user: any }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'agent', content: string, ragContext?: any}[]>([
    { role: 'agent', content: `Hello ${user?.orgName || 'there'}. I am DIA, your DevOps Intelligence Agent enhanced with RAG (Retrieval-Augmented Generation). I can answer questions using your scanned telemetry data and trained knowledge from industry best practices. What would you like to know?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgentType, setSelectedAgentType] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Detect agent type from query
  const detectAgentType = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.match(/terraform|cloudformation|kubernetes|helm|ansible|pulumi|cdk/i)) return 'iac';
    if (lowerQuery.match(/slo|sli|incident|monitoring|alerting|on-call|pagerduty|datadog/i)) return 'sre';
    if (lowerQuery.match(/pipeline|deploy|build|test|github actions|gitlab ci|jenkins|circleci/i)) return 'cicd';
    if (lowerQuery.match(/mlops|model|experiment|feature store|ml lifecycle|mlflow/i)) return 'aidlc';
    if (lowerQuery.match(/ai assist|copilot|code generation|developer productivity|prompt/i)) return 'aidc';

    return selectedAgentType || 'sre'; // Default to SRE
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      // Detect agent type and retrieve RAG context
      const agentType = detectAgentType(userMsg);

      // Query RAG for relevant context
      const ragRes = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentType, query: userMsg, topK: 5 })
      });
      const ragData = await ragRes.json();

      // Send to agent with RAG context
      const res = await fetch('/api/agent/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: user.org_id,
          query: userMsg,
          ragContext: ragData.success ? ragData.context : null,
          agentType
        })
      });
      const data = await res.json();

      if (data.success) {
        setMessages(prev => [...prev, {
          role: 'agent',
          content: data.text,
          ragContext: ragData.success ? ragData.documents : null
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'agent', content: `Error: ${data.message}` }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'agent', content: "Connection error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-500" /> DIA Intelligence Chat
        </h2>
        <p className="text-sm text-zinc-400 mt-1">Ask questions about your organization's specific scan data. Powered by Claude AI.</p>
      </div>

      <Card className="flex-1 flex flex-col p-0 overflow-hidden border-white/10">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className={cn("flex gap-4 max-w-[85%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                msg.role === 'agent' ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400" : "bg-white/10 border border-white/20 text-white"
              )}>
                {msg.role === 'agent' ? <Terminal className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
              </div>
              <div className={cn(
                "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                msg.role === 'user' ? "bg-white/10 text-white rounded-tr-sm" : "bg-black/40 border border-white/5 text-zinc-300 rounded-tl-sm"
              )}>
                {msg.role === 'agent' ? (
                  <div className="markdown-body prose prose-invert prose-emerald max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 max-w-[85%]">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <Terminal className="w-4 h-4" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-black/40 border border-white/5 text-zinc-300 rounded-tl-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                <span className="text-sm text-zinc-500">Analyzing organization data...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 border-t border-white/10 bg-black/20">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="E.g., What security issues were found in our Jenkins pipelines?"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="absolute right-2 p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
};

// Auto-PR Remediation Button Component
const AutoPRButton = ({ user, finding, repoFullName, filePath }: { user: any, finding: any, repoFullName?: string, filePath?: string }) => {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [prResult, setPrResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreatePR = async () => {
    setState('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/remediation/auto-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: user.org_id,
          finding,
          repoFullName: repoFullName || finding.repo || finding.repoFullName,
          filePath: filePath || finding.file || finding.filePath
        })
      });

      const data = await res.json();

      if (data.success) {
        setState('success');
        setPrResult(data.pr);
      } else {
        setState('error');
        setErrorMsg(data.message || 'Failed to create PR');
      }
    } catch (err: any) {
      setState('error');
      setErrorMsg(err.message || 'Network error');
    }
  };

  if (state === 'success' && prResult) {
    return (
      <a
        href={prResult.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs hover:bg-emerald-500/20 transition-colors"
      >
        <CheckCircle2 className="w-3 h-3" />
        PR #{prResult.number}
        <ArrowUpRight className="w-3 h-3" />
      </a>
    );
  }

  if (state === 'error') {
    return (
      <div className="inline-flex items-center gap-1.5">
        <button
          onClick={handleCreatePR}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-xs hover:bg-red-500/20 transition-colors"
          title={errorMsg}
        >
          <AlertCircle className="w-3 h-3" />
          Retry
        </button>
        <span className="text-[10px] text-red-400 max-w-[150px] truncate" title={errorMsg}>{errorMsg}</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleCreatePR}
      disabled={state === 'loading'}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors",
        state === 'loading'
          ? "bg-purple-500/10 text-purple-300 border border-purple-500/20 cursor-wait"
          : "bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 hover:text-purple-300"
      )}
    >
      {state === 'loading' ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          Creating PR...
        </>
      ) : (
        <>
          <GitPullRequest className="w-3 h-3" />
          Fix with PR
        </>
      )}
    </button>
  );
};

const CicdAgentView = ({ user }: { user: any }) => {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'complete'>('idle');
  const [scanData, setScanData] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [configPlatform, setConfigPlatform] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState({ credentialType: '', credentialValue: '', endpointUrl: '' });
  const [configLoading, setConfigLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const platformConfigs: Record<string, { name: string, icon: any, color: string, credTypes: string[], needsEndpoint: boolean }> = {
    'GitHub Actions': { name: 'GitHub Actions', icon: Github, color: 'emerald', credTypes: ['Personal Access Token', 'GitHub App'], needsEndpoint: false },
    'GitLab CI': { name: 'GitLab CI', icon: Gitlab, color: 'orange', credTypes: ['Personal Access Token', 'Project Token'], needsEndpoint: true },
    'Jenkins': { name: 'Jenkins', icon: Box, color: 'blue', credTypes: ['API Token', 'Username/Password'], needsEndpoint: true },
    'AWS CodePipeline': { name: 'AWS CodePipeline', icon: Cloud, color: 'amber', credTypes: ['IAM Access Keys', 'IAM Role ARN'], needsEndpoint: false },
    'Azure DevOps': { name: 'Azure DevOps', icon: Hexagon, color: 'cyan', credTypes: ['Personal Access Token', 'Service Principal'], needsEndpoint: true },
  };

  useEffect(() => {
    // Fetch historical data and credentials on mount
    if (user?.org_id) {
      fetch(`/api/agents/cicd/results?orgId=${user.org_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.hasData) {
            setScanData(data.data);
            setScanState('complete');
          }
        })
        .catch(console.error);

      fetch(`/api/credentials?orgId=${user.org_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setCredentials(data.credentials || []);
          }
        })
        .catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const isConfigured = (platform: string) => credentials.some(c => c.platform === platform && c.is_configured);
  const configuredCount = Object.keys(platformConfigs).filter(p => isConfigured(p)).length;

  const [validationStatus, setValidationStatus] = useState<{ success?: boolean; message?: string; user?: any } | null>(null);

  const saveCredential = async () => {
    if (!configPlatform || !configForm.credentialType || !configForm.credentialValue) return;
    setConfigLoading(true);
    setValidationStatus(null);

    try {
      // First validate the credentials
      const validateRes = await fetch('/api/credentials/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: configPlatform,
          credentialValue: configForm.credentialValue,
          endpointUrl: configForm.endpointUrl || null
        })
      });
      const validateData = await validateRes.json();

      if (!validateData.success) {
        setValidationStatus({ success: false, message: validateData.message });
        setConfigLoading(false);
        return;
      }

      setValidationStatus({ success: true, message: validateData.message, user: validateData.user });

      // Save the credentials
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: user.org_id,
          platform: configPlatform,
          credentialType: configForm.credentialType,
          credentialValue: configForm.credentialValue,
          endpointUrl: configForm.endpointUrl || null
        })
      });
      const data = await res.json();
      if (data.success) {
        // Refresh credentials
        const credsRes = await fetch(`/api/credentials?orgId=${user.org_id}`);
        const credsData = await credsRes.json();
        if (credsData.success) setCredentials(credsData.credentials || []);

        // Keep showing success briefly before closing
        setTimeout(() => {
          setConfigPlatform(null);
          setConfigForm({ credentialType: '', credentialValue: '', endpointUrl: '' });
          setValidationStatus(null);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setValidationStatus({ success: false, message: 'Connection error. Please try again.' });
    } finally {
      setConfigLoading(false);
    }
  };

  const removeCredential = async (platform: string) => {
    try {
      await fetch('/api/credentials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: user.org_id, platform })
      });
      setCredentials(credentials.filter(c => c.platform !== platform));
    } catch (err) {
      console.error(err);
    }
  };

  const runScan = async () => {
    if (configuredCount === 0) {
      setShowConfig(true);
      return;
    }

    const configuredPlatforms = Object.keys(platformConfigs).filter(p => isConfigured(p)).join(',');

    // Start background scan using global context
    const scanId = await startScan('cicd', configuredPlatforms, user?.org_id);

    // Update local state to show that scan has been initiated
    setScanState('scanning');
    setScanData(null);
    setLogs(['[SYSTEM] Scan started in background - you can navigate freely!']);

    // Poll scan status to update local display
    const pollInterval = setInterval(() => {
      const scan = Array.from(activeScans.values()).find(s => s.scanId === scanId);

      if (scan) {
        setLogs(scan.logs);

        if (scan.status === 'complete') {
          setScanData(scan.data);
          setScanState('complete');
          clearInterval(pollInterval);
        } else if (scan.status === 'error') {
          setScanState('idle');
          clearInterval(pollInterval);
        }
      }
    }, 500);

    // Cleanup interval on unmount
    return () => clearInterval(pollInterval);
  };

  const getProgress = () => {
    if (scanState === 'complete') return 100;
    if (logs.some(l => l.includes('Discovery complete'))) return 95;
    if (logs.some(l => l.includes('[SKILLS]'))) return 90;
    if (logs.some(l => l.includes('[AZURE]'))) return 75;
    if (logs.some(l => l.includes('[AWS]'))) return 60;
    if (logs.some(l => l.includes('[JENKINS]'))) return 45;
    if (logs.some(l => l.includes('[GITLAB]'))) return 30;
    if (logs.some(l => l.includes('[GITHUB]'))) return 15;
    if (logs.length > 0) return 5;
    return 0;
  };

  const progress = getProgress();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-emerald-500" /> CI/CD Discovery Agent
          </h2>
          <p className="text-sm text-zinc-400 mt-1">Configure credentials and scan your CI/CD platforms for maturity assessment.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border",
              showConfig ? "bg-white/10 text-white border-white/20" : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
            )}
          >
            <Settings className="w-4 h-4" /> Configure ({configuredCount}/5)
          </button>
          {scanState !== 'scanning' && (
            <button
              onClick={runScan}
              disabled={configuredCount === 0}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors",
                configuredCount > 0
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
              )}
            >
              <Play className="w-4 h-4" /> {scanState === 'complete' ? 'Run New Scan' : 'Run Discovery Sweep'}
            </button>
          )}
        </div>
      </div>

      {/* Credentials Configuration Panel */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-dashed border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-500" /> Platform Credentials
                </h3>
                <p className="text-xs text-zinc-500">Credentials are encrypted and stored securely</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(platformConfigs).map(([platform, config]) => {
                  const Icon = config.icon;
                  const configured = isConfigured(platform);
                  const cred = credentials.find(c => c.platform === platform);

                  return (
                    <div
                      key={platform}
                      className={cn(
                        "p-4 rounded-lg border transition-all",
                        configured
                          ? "bg-emerald-500/5 border-emerald-500/30"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("w-5 h-5", configured ? `text-${config.color}-400` : "text-zinc-500")} />
                          <span className="text-sm font-medium text-white">{config.name}</span>
                        </div>
                        {configured ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-zinc-500" />
                        )}
                      </div>

                      {configured ? (
                        <div className="space-y-2">
                          <p className="text-xs text-zinc-400">
                            <span className="text-emerald-400">{cred?.credential_type}</span>
                            {cred?.endpoint_url && <span className="block text-zinc-500 truncate">{cred.endpoint_url}</span>}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setConfigPlatform(platform);
                                setConfigForm({
                                  credentialType: cred?.credential_type || '',
                                  credentialValue: '',
                                  endpointUrl: cred?.endpoint_url || ''
                                });
                              }}
                              className="text-xs text-zinc-400 hover:text-white transition-colors"
                            >
                              Update
                            </button>
                            <button
                              onClick={() => removeCredential(platform)}
                              className="text-xs text-red-400 hover:text-red-300 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setConfigPlatform(platform);
                            setConfigForm({ credentialType: config.credTypes[0], credentialValue: '', endpointUrl: '' });
                          }}
                          className="w-full text-xs text-emerald-400 hover:text-emerald-300 transition-colors text-left"
                        >
                          + Add Credentials
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Credential Form Modal */}
              {configPlatform && (
                <div className="mt-4 p-4 bg-black/40 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-white">
                      Configure {configPlatform}
                    </h4>
                    <button onClick={() => setConfigPlatform(null)} className="text-zinc-500 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Credential Type</label>
                      <select
                        value={configForm.credentialType}
                        onChange={(e) => setConfigForm({ ...configForm, credentialType: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                      >
                        {platformConfigs[configPlatform]?.credTypes.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">
                        {configForm.credentialType || 'Credential Value'}
                      </label>
                      <input
                        type="password"
                        value={configForm.credentialValue}
                        onChange={(e) => setConfigForm({ ...configForm, credentialValue: e.target.value })}
                        placeholder="Enter credential..."
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>

                    {platformConfigs[configPlatform]?.needsEndpoint && (
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Endpoint URL</label>
                        <input
                          type="text"
                          value={configForm.endpointUrl}
                          onChange={(e) => setConfigForm({ ...configForm, endpointUrl: e.target.value })}
                          placeholder={configPlatform === 'Jenkins' ? 'https://jenkins.company.com' : 'https://gitlab.company.com'}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                    )}

                    {validationStatus && (
                      <div className={cn(
                        "p-3 rounded-lg flex items-center gap-2 text-sm",
                        validationStatus.success
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                          : "bg-red-500/10 border border-red-500/20 text-red-400"
                      )}>
                        {validationStatus.success ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                        )}
                        <span>{validationStatus.message}</span>
                        {validationStatus.user && (
                          <span className="ml-auto text-xs text-zinc-400">@{validationStatus.user.login}</span>
                        )}
                      </div>
                    )}

                    <button
                      onClick={saveCredential}
                      disabled={configLoading || !configForm.credentialValue}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                    >
                      {configLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {configLoading ? 'Validating...' : 'Validate & Save Credentials'}
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Platform Status Cards */}
      {(scanState === 'idle' || scanState === 'scanning') && !showConfig && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(platformConfigs).map(([platform, config]) => {
            const Icon = config.icon;
            const configured = isConfigured(platform);
            const isScanning = scanState === 'scanning' && logs.some(l => l.includes(`[${platform.split(' ')[0].toUpperCase()}]`));
            const isDone = scanState === 'scanning' && logs.some(l => {
              const platformOrder = ['GITHUB', 'GITLAB', 'JENKINS', 'AWS', 'AZURE', 'SKILLS'];
              const currentIdx = platformOrder.indexOf(platform.split(' ')[0].toUpperCase());
              return platformOrder.slice(currentIdx + 1).some(p => logs.some(log => log.includes(`[${p}]`)));
            });

            return (
              <Card
                key={platform}
                className={cn(
                  "flex flex-col items-center justify-center text-center p-6 border-dashed transition-colors",
                  !configured && "opacity-50",
                  isScanning && !isDone && `border-${config.color}-500/50 bg-${config.color}-500/5`
                )}
              >
                <div className="relative">
                  <Icon className={cn("w-8 h-8 mb-3", configured ? `text-${config.color}-400` : "text-zinc-600")} />
                  {configured && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-900" />
                  )}
                  {isScanning && !isDone && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${config.color}-400 opacity-75`}></span>
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 bg-${config.color}-500`}></span>
                    </span>
                  )}
                </div>
                <h3 className="text-white font-medium text-sm mb-1">{config.name}</h3>
                <p className="text-[10px] text-zinc-500">
                  {!configured ? 'Not configured' :
                   isDone ? 'Complete' :
                   isScanning ? 'Scanning...' :
                   scanState === 'idle' ? 'Ready' : 'Waiting...'}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Scanning Progress */}
      {scanState === 'scanning' && (
        <Card className="p-5 flex flex-col gap-4 bg-emerald-500/10 border-emerald-500/20">
          <div className="flex items-start gap-4">
            <div className="mt-0.5">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-emerald-400 font-medium text-sm">Scan in Progress</h3>
                <span className="text-emerald-400 text-xs font-mono">{progress}%</span>
              </div>
              <div className="w-full bg-emerald-950/50 rounded-full h-1.5 mb-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-emerald-500/70 font-mono">{logs[logs.length - 1] || 'Initializing...'}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Terminal Output */}
      {(scanState === 'scanning' || (scanState === 'complete' && logs.length > 0)) && (
        <Card className="bg-black border-zinc-800 font-mono text-xs p-4 h-48 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4 text-zinc-500 border-b border-zinc-800 pb-2">
            <Terminal className="w-4 h-4" /> Agent Terminal Output
            {scanState === 'scanning' && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
          </div>
          <div className="space-y-1.5">
            {logs.map((log, i) => (
              <div key={i} className={cn(
                log.includes('[ERROR]') ? 'text-red-400' :
                log.includes('[SYSTEM]') ? 'text-emerald-400' :
                log.includes('[SKILLS]') ? 'text-purple-400' :
                'text-zinc-400'
              )}>
                {log}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </Card>
      )}

      {/* Scan Results */}
      {scanState === 'complete' && scanData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-2xl font-light text-white">{scanData.summary.totalPipelines}</div>
              <div className="text-xs text-zinc-500 uppercase mt-1">Pipelines Scanned</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-light text-emerald-400">{scanData.summary.overallMaturity}/100</div>
              <div className="text-xs text-zinc-500 uppercase mt-1">Avg Maturity Score</div>
            </Card>
            <Card className="p-4 border-red-500/20 bg-red-500/5">
              <div className="text-2xl font-light text-red-400">{scanData.summary.criticalIssues}</div>
              <div className="text-xs text-red-500/70 uppercase mt-1">Critical Findings</div>
            </Card>
            <Card className="p-4 border-amber-500/20 bg-amber-500/5">
              <div className="text-2xl font-light text-amber-400">{scanData.summary.highIssues}</div>
              <div className="text-xs text-amber-500/70 uppercase mt-1">High Findings</div>
            </Card>
          </div>

          {/* IaC Analysis Section */}
          {scanData.iacStats && (
            <Card className="p-0 overflow-hidden">
              <div className="p-4 border-b border-white/10 bg-white/5">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" /> Infrastructure as Code Analysis
                </h3>
              </div>
              <div className="p-4">
                {/* IaC Adoption Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <div className="text-2xl font-light text-cyan-400">
                      {Math.round((scanData.iacStats.reposWithIaC / Math.max(scanData.iacStats.totalRepos, 1)) * 100)}%
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase mt-1">IaC Adoption</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <div className="text-2xl font-light text-white">{scanData.iacStats.reposWithIaC}</div>
                    <div className="text-[10px] text-zinc-500 uppercase mt-1">Repos with IaC</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <div className="text-2xl font-light text-white">
                      {scanData.iacStats.terraformFiles + scanData.iacStats.cfnFiles + scanData.iacStats.cdkFiles}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase mt-1">IaC Files</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <div className="text-2xl font-light text-white">{scanData.iacStats.iacSecurityTools}</div>
                    <div className="text-[10px] text-zinc-500 uppercase mt-1">Security Scans</div>
                  </div>
                </div>

                {/* IaC Tool Distribution */}
                <div className="mb-6">
                  <h4 className="text-xs font-medium text-zinc-400 uppercase mb-3">IaC Tool Distribution</h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div className={cn(
                      "p-3 rounded-lg border text-center",
                      scanData.iacStats.terraformRepos > 0 ? "bg-purple-500/10 border-purple-500/30" : "bg-white/5 border-white/10"
                    )}>
                      <div className="text-lg font-light text-white">{scanData.iacStats.terraformRepos}</div>
                      <div className="text-[10px] text-purple-400">Terraform</div>
                      <div className="text-[10px] text-zinc-500">{scanData.iacStats.terraformFiles} files</div>
                    </div>
                    <div className={cn(
                      "p-3 rounded-lg border text-center",
                      scanData.iacStats.cloudformationRepos > 0 ? "bg-orange-500/10 border-orange-500/30" : "bg-white/5 border-white/10"
                    )}>
                      <div className="text-lg font-light text-white">{scanData.iacStats.cloudformationRepos}</div>
                      <div className="text-[10px] text-orange-400">CloudFormation</div>
                      <div className="text-[10px] text-zinc-500">{scanData.iacStats.cfnFiles} files</div>
                    </div>
                    <div className={cn(
                      "p-3 rounded-lg border text-center",
                      scanData.iacStats.cdkRepos > 0 ? "bg-amber-500/10 border-amber-500/30" : "bg-white/5 border-white/10"
                    )}>
                      <div className="text-lg font-light text-white">{scanData.iacStats.cdkRepos}</div>
                      <div className="text-[10px] text-amber-400">AWS CDK</div>
                      <div className="text-[10px] text-zinc-500">{scanData.iacStats.cdkFiles} files</div>
                    </div>
                    <div className={cn(
                      "p-3 rounded-lg border text-center",
                      scanData.iacStats.pulumiRepos > 0 ? "bg-blue-500/10 border-blue-500/30" : "bg-white/5 border-white/10"
                    )}>
                      <div className="text-lg font-light text-white">{scanData.iacStats.pulumiRepos || 0}</div>
                      <div className="text-[10px] text-blue-400">Pulumi</div>
                      <div className="text-[10px] text-zinc-500">0 files</div>
                    </div>
                  </div>
                </div>

                {/* Tagging & Governance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-medium text-zinc-400 uppercase mb-3">Tagging Compliance</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-400">Resources with Tags</span>
                          <span className={cn(
                            "font-mono",
                            scanData.iacStats.filesWithTags > scanData.iacStats.filesWithoutTags ? "text-emerald-400" : "text-red-400"
                          )}>
                            {scanData.iacStats.filesWithTags}/{scanData.iacStats.filesWithTags + scanData.iacStats.filesWithoutTags}
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5">
                          <div
                            className={cn(
                              "h-1.5 rounded-full",
                              scanData.iacStats.filesWithTags > scanData.iacStats.filesWithoutTags ? "bg-emerald-500" : "bg-red-500"
                            )}
                            style={{ width: `${scanData.iacStats.filesWithTags + scanData.iacStats.filesWithoutTags > 0 ? (scanData.iacStats.filesWithTags / (scanData.iacStats.filesWithTags + scanData.iacStats.filesWithoutTags)) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className={cn("p-2 rounded", scanData.iacStats.missingEnvTag > 0 ? "bg-red-500/10" : "bg-emerald-500/10")}>
                          <div className={cn("text-sm font-mono", scanData.iacStats.missingEnvTag > 0 ? "text-red-400" : "text-emerald-400")}>
                            {scanData.iacStats.missingEnvTag || 0}
                          </div>
                          <div className="text-[9px] text-zinc-500">Missing Env</div>
                        </div>
                        <div className={cn("p-2 rounded", scanData.iacStats.missingOwnerTag > 0 ? "bg-red-500/10" : "bg-emerald-500/10")}>
                          <div className={cn("text-sm font-mono", scanData.iacStats.missingOwnerTag > 0 ? "text-red-400" : "text-emerald-400")}>
                            {scanData.iacStats.missingOwnerTag || 0}
                          </div>
                          <div className="text-[9px] text-zinc-500">Missing Owner</div>
                        </div>
                        <div className={cn("p-2 rounded", scanData.iacStats.missingCostCenterTag > 0 ? "bg-amber-500/10" : "bg-emerald-500/10")}>
                          <div className={cn("text-sm font-mono", scanData.iacStats.missingCostCenterTag > 0 ? "text-amber-400" : "text-emerald-400")}>
                            {scanData.iacStats.missingCostCenterTag || 0}
                          </div>
                          <div className="text-[9px] text-zinc-500">Missing Cost</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-medium text-zinc-400 uppercase mb-3">Environment & Sizing</h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 rounded bg-emerald-500/10">
                          <div className="text-sm font-mono text-emerald-400">{scanData.iacStats.envSpecificConfigs?.dev || 0}</div>
                          <div className="text-[9px] text-zinc-500">Dev</div>
                        </div>
                        <div className="p-2 rounded bg-amber-500/10">
                          <div className="text-sm font-mono text-amber-400">{scanData.iacStats.envSpecificConfigs?.staging || 0}</div>
                          <div className="text-[9px] text-zinc-500">Staging</div>
                        </div>
                        <div className="p-2 rounded bg-purple-500/10">
                          <div className="text-sm font-mono text-purple-400">{scanData.iacStats.envSpecificConfigs?.prod || 0}</div>
                          <div className="text-[9px] text-zinc-500">Prod</div>
                        </div>
                        <div className="p-2 rounded bg-zinc-500/10">
                          <div className="text-sm font-mono text-zinc-400">{scanData.iacStats.envSpecificConfigs?.default || 0}</div>
                          <div className="text-[9px] text-zinc-500">Default</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-white/5">
                        <span className="text-xs text-zinc-400">Variable Sizing</span>
                        <span className={cn(
                          "text-xs font-mono",
                          scanData.iacStats.variableSizes >= scanData.iacStats.hardcodedSizes ? "text-emerald-400" : "text-amber-400"
                        )}>
                          {scanData.iacStats.variableSizes || 0} / {(scanData.iacStats.variableSizes || 0) + (scanData.iacStats.hardcodedSizes || 0)}
                        </span>
                      </div>
                      {scanData.iacStats.oversizedDevResources > 0 && (
                        <div className="p-2 rounded bg-red-500/10 flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                          <span className="text-xs text-red-400">
                            {scanData.iacStats.oversizedDevResources} oversized dev/staging resources
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Security & Modularity */}
                <div className="grid grid-cols-4 gap-3 mt-6 pt-4 border-t border-white/10">
                  <div className="text-center">
                    <div className={cn(
                      "text-lg font-light",
                      scanData.iacStats.remoteState > scanData.iacStats.localState ? "text-emerald-400" : "text-red-400"
                    )}>
                      {scanData.iacStats.remoteState || 0}
                    </div>
                    <div className="text-[9px] text-zinc-500 uppercase">Remote State</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-light text-white">{scanData.iacStats.moduleUsage || 0}</div>
                    <div className="text-[9px] text-zinc-500 uppercase">Module Usage</div>
                  </div>
                  <div className="text-center">
                    <div className={cn(
                      "text-lg font-light",
                      scanData.iacStats.versionPinned > scanData.iacStats.unpinnedVersions ? "text-emerald-400" : "text-amber-400"
                    )}>
                      {scanData.iacStats.versionPinned || 0}
                    </div>
                    <div className="text-[9px] text-zinc-500 uppercase">Version Pinned</div>
                  </div>
                  <div className="text-center">
                    <div className={cn(
                      "text-lg font-light",
                      scanData.iacStats.secretsInIaC === 0 ? "text-emerald-400" : "text-red-400"
                    )}>
                      {scanData.iacStats.secretsInIaC || 0}
                    </div>
                    <div className="text-[9px] text-zinc-500 uppercase">Secrets in IaC</div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Skills Assessment */}
          {scanData.skillAssessments && scanData.skillAssessments.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <div className="p-4 border-b border-white/10 bg-white/5">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-purple-400" /> Skills-Based Maturity Assessment
                </h3>
              </div>
              <div className="divide-y divide-white/5">
                {scanData.skillAssessments.map((skill: any, idx: number) => (
                  <div key={idx} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold",
                          skill.status === 'fail' ? 'bg-red-500/10 text-red-400' :
                          skill.status === 'warn' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-emerald-500/10 text-emerald-400'
                        )}>
                          {skill.score}/100
                        </span>
                        <span className="text-sm font-medium text-white">{skill.skillName}</span>
                        <span className="text-xs text-zinc-500 bg-white/5 px-2 py-0.5 rounded">{skill.category}</span>
                      </div>
                    </div>
                    {skill.findings && skill.findings.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {skill.findings.map((f: string, fIdx: number) => (
                          <p key={fIdx} className="text-xs text-zinc-400 pl-4 border-l border-white/10">{f}</p>
                        ))}
                      </div>
                    )}
                    {skill.status !== 'pass' && skill.remediation && (
                      <div className="mt-3 p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg flex items-start justify-between gap-4">
                        <p className="text-xs text-purple-300 flex items-start gap-2 flex-1">
                          <Wrench className="w-3 h-3 mt-0.5 shrink-0" />
                          <span><strong>Remediation:</strong> {skill.remediation}</span>
                        </p>
                        {skill.repo && (
                          <AutoPRButton
                            user={user}
                            finding={{
                              type: skill.skillId,
                              severity: skill.status === 'fail' ? 'HIGH' : 'MEDIUM',
                              message: skill.skillName + ': ' + (skill.findings?.[0] || skill.remediation),
                              remediation: skill.remediation,
                              repo: skill.repo
                            }}
                            repoFullName={skill.repo}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Platform Details */}
          <div className="grid grid-cols-1 gap-6">
            {scanData.platforms.map((platform: any, idx: number) => (
              <Card key={idx} className="p-0 overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {platform.name === 'GitHub Actions' && <Github className="w-5 h-5 text-white" />}
                    {platform.name === 'GitLab CI' && <Gitlab className="w-5 h-5 text-orange-500" />}
                    {platform.name === 'Jenkins' && <Box className="w-5 h-5 text-blue-400" />}
                    {platform.name === 'AWS CodePipeline' && <Cloud className="w-5 h-5 text-amber-400" />}
                    {platform.name === 'Azure DevOps' && <Hexagon className="w-5 h-5 text-cyan-400" />}
                    <h3 className="font-medium text-white">{platform.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Connected</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-zinc-400">{platform.pipelinesScanned} pipelines</span>
                    <span className="text-white font-mono bg-white/10 px-2 py-1 rounded">Score: {platform.maturityScore}</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {platform.findings.map((finding: any, fIdx: number) => (
                    <div key={fIdx} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/[0.07] transition-colors">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold tracking-wider mt-0.5 shrink-0",
                        finding.severity === 'CRITICAL' ? 'bg-red-500 text-white' :
                        finding.severity === 'HIGH' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        finding.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                      )}>
                        {finding.severity}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-zinc-300">{finding.message}</p>
                        {finding.file && (
                          <p className="text-xs text-zinc-500 mt-1 font-mono">{finding.file}</p>
                        )}
                        {finding.remediation && (
                          <p className="text-xs text-purple-300 mt-2 flex items-start gap-1">
                            <Wrench className="w-3 h-3 mt-0.5 shrink-0" />
                            {finding.remediation}
                          </p>
                        )}
                      </div>
                      {finding.repo && <AutoPRButton user={user} finding={finding} repoFullName={finding.repo} filePath={finding.file} />}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

const OverviewView = ({ user }: { user: any }) => {
  const [summaryData, setSummaryData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate chart data has valid numeric values
  const hasValidChartData = (data: any) => {
    if (!data || !Array.isArray(data) || data.length === 0) return false;
    // Check if at least one item has at least one numeric value
    return data.some((item: any) => {
      if (!item || typeof item !== 'object') return false;
      return Object.values(item).some(val => typeof val === 'number' && !isNaN(val) && isFinite(val));
    });
  };

  useEffect(() => {
    if (user?.org_id) {
      fetch(`/api/executive-summary?orgId=${user.org_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setSummaryData(data);
          }
          setIsLoading(false);
        })
        .catch(err => {
          console.error(err);
          setIsLoading(false);
        });
    }
  }, [user]);

  const formatWaste = (amount: number) => {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
    return `$${amount}`;
  };

  const getDoraBandColor = (band: string) => {
    if (band === 'Elite') return 'text-purple-400';
    if (band === 'High') return 'text-emerald-400';
    if (band === 'Medium') return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const summary = summaryData?.summary || {};
  const roadmap = summaryData?.remediationRoadmap || remediationRoadmap;
  const hasData = summaryData?.hasData;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2 bg-gradient-to-br from-[#111111] to-[#1a1a1a]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-white">Executive Summary</h2>
            {summary.lastScanTime && (
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last scan: {new Date(summary.lastScanTime).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed mb-6">
            {hasData ? summary.summaryText : (
              <>
                Welcome to DIA Platform Intelligence. To get started, navigate to the <strong className="text-emerald-400">CI/CD Agent</strong> tab,
                configure your tool credentials (GitHub, GitLab, Jenkins, etc.), and run a discovery sweep.
                Your executive summary will update automatically based on real scan results.
              </>
            )}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className={cn("text-3xl font-light", hasData ? getScoreColor(summary.platformScore) : "text-zinc-600")}>
                {hasData ? summary.platformScore : '--'}<span className="text-lg text-zinc-500">/100</span>
              </div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Platform Score</div>
            </div>
            <div>
              <div className={cn("text-3xl font-light", hasData ? getDoraBandColor(summary.doraBand) : "text-zinc-600")}>
                {hasData ? summary.doraBand : '--'}
              </div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">DORA Band</div>
            </div>
            <div>
              <div className={cn("text-3xl font-light", hasData && summary.changeFailureRate > 20 ? "text-red-400" : hasData ? "text-amber-400" : "text-zinc-600")}>
                {hasData ? `${summary.changeFailureRate}%` : '--%'}
              </div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Change Failure</div>
            </div>
            <div>
              <div className={cn("text-3xl font-light", hasData && summary.estimatedWaste > 0 ? "text-red-400" : "text-zinc-600")}>
                {hasData && summary.estimatedWaste > 0 ? formatWaste(summary.estimatedWaste) : '--'}
              </div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Est. Risk Cost</div>
            </div>
          </div>

          {/* Additional stats row */}
          {hasData && (
            <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-white/10">
              <div className="text-center">
                <div className="text-lg font-light text-white">{summary.totalPipelines}</div>
                <div className="text-[10px] text-zinc-500 uppercase">Pipelines</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-light text-white">{summary.platformsScanned}</div>
                <div className="text-[10px] text-zinc-500 uppercase">Platforms</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-light text-red-400">{summary.criticalFindings}</div>
                <div className="text-[10px] text-zinc-500 uppercase">Critical</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-light text-amber-400">{summary.highFindings}</div>
                <div className="text-[10px] text-zinc-500 uppercase">High</div>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">Remediation Roadmap</h3>
          <div className="space-y-4">
            {roadmap.map((phase: any, i: number) => (
              <div key={i} className="relative pl-4 border-l border-white/10">
                <div className={cn(
                  "absolute w-2 h-2 rounded-full -left-[4.5px] top-1.5",
                  i === 0 ? "bg-red-500" : i === 1 ? "bg-amber-500" : "bg-emerald-500"
                )}></div>
                <div className="text-xs font-mono text-emerald-400 mb-1">{phase.phase}</div>
                <div className="text-sm text-white font-medium mb-2">{phase.focus}</div>
                {phase.tasks && (
                  <ul className="space-y-1">
                    {phase.tasks.slice(0, 2).map((task: string, idx: number) => (
                      <li key={idx} className="text-xs text-zinc-500 flex items-start gap-1">
                        <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{task}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* IaC & SRE Metrics Section */}
      {hasData && (summaryData?.iacMetrics || summaryData?.sreMetrics) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* IaC Metrics Card */}
          {summaryData?.iacMetrics && (
            <Card>
              <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-400" /> Infrastructure as Code
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-zinc-500 uppercase mb-1">IaC Adoption</div>
                  <div className={cn("text-2xl font-light", summaryData.iacMetrics.adoptionRate >= 70 ? "text-emerald-400" : summaryData.iacMetrics.adoptionRate >= 40 ? "text-amber-400" : "text-red-400")}>
                    {summaryData.iacMetrics.adoptionRate}%
                  </div>
                  <div className="text-[10px] text-zinc-600">{summaryData.iacMetrics.reposWithIaC}/{summaryData.iacMetrics.totalRepos} repos</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-zinc-500 uppercase mb-1">Tag Compliance</div>
                  <div className={cn("text-2xl font-light", summaryData.iacMetrics.tagging?.complianceRate >= 70 ? "text-emerald-400" : summaryData.iacMetrics.tagging?.complianceRate >= 40 ? "text-amber-400" : "text-red-400")}>
                    {summaryData.iacMetrics.tagging?.complianceRate || 0}%
                  </div>
                  <div className="text-[10px] text-zinc-600">
                    {summaryData.iacMetrics.tagging?.missingEnvTag || 0} missing env tags
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-zinc-500 uppercase mb-1">Right-Sizing</div>
                  <div className={cn("text-2xl font-light", summaryData.iacMetrics.sizing?.rightSizingScore >= 70 ? "text-emerald-400" : summaryData.iacMetrics.sizing?.rightSizingScore >= 40 ? "text-amber-400" : "text-red-400")}>
                    {summaryData.iacMetrics.sizing?.rightSizingScore || 0}%
                  </div>
                  <div className="text-[10px] text-zinc-600">
                    {summaryData.iacMetrics.sizing?.oversizedDevResources || 0} oversized dev resources
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-zinc-500 uppercase mb-1">Security</div>
                  <div className={cn("text-2xl font-light", summaryData.iacMetrics.security?.secretsInIaC === 0 ? "text-emerald-400" : "text-red-400")}>
                    {summaryData.iacMetrics.security?.secretsInIaC === 0 ? 'Clean' : summaryData.iacMetrics.security?.secretsInIaC + ' Issues'}
                  </div>
                  <div className="text-[10px] text-zinc-600">
                    {summaryData.iacMetrics.security?.remoteState || 0} using remote state
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {summaryData.iacMetrics.toolDistribution?.terraform > 0 && (
                  <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs">
                    Terraform: {summaryData.iacMetrics.toolDistribution.terraform}
                  </span>
                )}
                {summaryData.iacMetrics.toolDistribution?.cloudformation > 0 && (
                  <span className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded text-xs">
                    CloudFormation: {summaryData.iacMetrics.toolDistribution.cloudformation}
                  </span>
                )}
                {summaryData.iacMetrics.toolDistribution?.cdk > 0 && (
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs">
                    CDK: {summaryData.iacMetrics.toolDistribution.cdk}
                  </span>
                )}
              </div>
            </Card>
          )}

          {/* SRE Metrics Card */}
          {summaryData?.sreMetrics && (
            <Card>
              <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" /> SRE Agent
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="35" fill="none" stroke="#333" strokeWidth="6" />
                    <circle
                      cx="40" cy="40" r="35" fill="none"
                      stroke={summaryData.sreMetrics.overallScore >= 70 ? '#10b981' : summaryData.sreMetrics.overallScore >= 40 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="6"
                      strokeDasharray={`${(summaryData.sreMetrics.overallScore / 100) * 220} 220`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-light text-white">{summaryData.sreMetrics.overallScore}</span>
                  </div>
                </div>
                <div>
                  <div className={cn(
                    "text-lg font-medium",
                    summaryData.sreMetrics.band === 'Advanced' ? 'text-emerald-400' :
                    summaryData.sreMetrics.band === 'Maturing' ? 'text-amber-400' : 'text-red-400'
                  )}>
                    {summaryData.sreMetrics.band}
                  </div>
                  <div className="text-xs text-zinc-500">{summaryData.sreMetrics.totalAssessments} assessments</div>
                  <div className="text-xs text-zinc-500">{summaryData.sreMetrics.platformsScanned?.length || 0} platforms</div>
                </div>
              </div>
              {summaryData.sreMetrics.lowestDomains?.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-zinc-500 uppercase mb-2">Needs Attention</div>
                  {summaryData.sreMetrics.lowestDomains.map((domain: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center py-1">
                      <span className="text-xs text-zinc-400">{domain.domain}</span>
                      <span className="text-xs text-red-400">{domain.score}/100</span>
                    </div>
                  ))}
                </div>
              )}
              {summaryData.sreMetrics.highestDomains?.length > 0 && (
                <div>
                  <div className="text-xs text-zinc-500 uppercase mb-2">Strengths</div>
                  {summaryData.sreMetrics.highestDomains.map((domain: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center py-1">
                      <span className="text-xs text-zinc-400">{domain.domain}</span>
                      <span className="text-xs text-emerald-400">{domain.score}/100</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Top Findings Section - Only show if has data */}
      {hasData && summaryData?.topFindings?.length > 0 && (
        <Card>
          <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Top Findings
          </h3>
          <div className="space-y-3">
            {summaryData.topFindings.map((finding: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/[0.07] transition-colors">
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold tracking-wider shrink-0",
                  finding.severity === 'CRITICAL' ? 'bg-red-500 text-white' :
                  finding.severity === 'HIGH' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  finding.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                )}>
                  {finding.severity}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-zinc-300">{finding.message}</p>
                  {(finding.platform || finding.repo) && (
                    <span className="text-xs text-zinc-500 mt-1 block">{finding.repo || finding.platform}</span>
                  )}
                </div>
                {finding.repo && <AutoPRButton user={user} finding={finding} repoFullName={finding.repo} filePath={finding.file} />}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" /> DORA: Velocity vs Quality
          </h3>
          {hasValidChartData(doraTrendData) ? (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                <LineChart data={doraTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="df" name="Deploy Freq" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="cfr" name="Change Failure %" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] w-full flex items-center justify-center text-zinc-500 text-sm">
              No trend data available
            </div>
          )}
          <p className="text-xs text-zinc-500 mt-4 text-center">
            {hasData
              ? `Platform maturity trending at ${summary.avgMaturityScore}/100. ${summary.criticalFindings > 0 ? 'Address critical findings to improve CFR.' : ''}`
              : 'Run a CI/CD scan to populate real-time DORA metrics.'}
          </p>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Skill Maturity Overview
          </h3>
          {hasData && summaryData?.skillHighlights?.length > 0 ? (
            <div className="space-y-4">
              {summaryData.skillHighlights.map((skill: any, idx: number) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-400">{skill.skill_name}</span>
                    <span className={cn(
                      "font-mono",
                      skill.score >= 70 ? "text-emerald-400" : skill.score >= 40 ? "text-amber-400" : "text-red-400"
                    )}>{skill.score}/100</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all",
                        skill.score >= 70 ? "bg-emerald-500" : skill.score >= 40 ? "bg-amber-500" : "bg-red-500"
                      )}
                      style={{ width: `${skill.score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">Maturity Score</span>
                  <span className="text-zinc-600 font-mono">--/100</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2">
                  <div className="bg-zinc-700 h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-xs text-zinc-500 uppercase mb-1">Secret Management</div>
                  <div className="text-xl font-light text-zinc-600">--</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-xs text-zinc-500 uppercase mb-1">Security Gates</div>
                  <div className="text-xl font-light text-zinc-600">--</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-xs text-zinc-500 uppercase mb-1">Automated Testing</div>
                  <div className="text-xl font-light text-zinc-600">--</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-xs text-zinc-500 uppercase mb-1">SAST Integration</div>
                  <div className="text-xl font-light text-zinc-600">--</div>
                </div>
              </div>
              <p className="text-xs text-zinc-500 text-center">
                Configure CI/CD tools and run a scan to see skill assessments.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

const IacView = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold text-white">IaC Intelligence & Cost Reasoning</h2>
        <p className="text-sm text-zinc-400 mt-1">Cost-cognizant development and infrastructure governance.</p>
      </div>
      <div className="text-right">
        <div className="text-2xl font-light text-red-400">$12,450</div>
        <div className="text-xs text-zinc-500 uppercase tracking-wider">Est. Monthly Waste</div>
      </div>
    </div>

    <Card className="p-0 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            <th className="p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Skill ID</th>
            <th className="p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Domain</th>
            <th className="p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Triggered By</th>
            <th className="p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Severity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {iacSkillsData.map((skill) => (
            <tr key={skill.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="p-4 text-xs font-mono text-zinc-500">{skill.id}</td>
              <td className="p-4 text-sm text-white">{skill.name}</td>
              <td className="p-4 text-sm text-zinc-400">{skill.trigger}</td>
              <td className="p-4">
                <span className={cn(
                  "px-2 py-1 rounded text-[10px] font-bold tracking-wider",
                  skill.severity === 'HIGH' ? 'bg-red-500/10 text-red-400' : 
                  skill.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' : 
                  'bg-zinc-500/10 text-zinc-400'
                )}>
                  {skill.severity}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  </div>
);

const SreView = ({ user }: { user: any }) => {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'complete'>('idle');
  const [scanData, setScanData] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [configPlatform, setConfigPlatform] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState({ apiKey: '', apiSecret: '', endpointUrl: '', appKey: '' });
  const [configLoading, setConfigLoading] = useState(false);
  const [validationStatus, setValidationStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [monitors, setMonitors] = useState<any[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const srePlatforms: Record<string, { name: string, icon: any, color: string, needsAppKey?: boolean, needsEndpoint?: boolean, needsSecret?: boolean }> = {
    'Datadog': { name: 'Datadog', icon: BarChart3, color: 'purple', needsAppKey: true },
    'PagerDuty': { name: 'PagerDuty', icon: Bell, color: 'green' },
    'VictorOps': { name: 'VictorOps', icon: AlertCircle, color: 'red', needsSecret: true },
    'Prometheus': { name: 'Prometheus', icon: Radio, color: 'orange', needsEndpoint: true },
    'Grafana': { name: 'Grafana', icon: Eye, color: 'amber', needsEndpoint: true },
    'OpsGenie': { name: 'OpsGenie', icon: Zap, color: 'blue' },
    'New Relic': { name: 'New Relic', icon: Activity, color: 'teal' },
  };

  useEffect(() => {
    if (user?.org_id) {
      // Fetch historical SRE results
      fetch(`/api/sre/results?orgId=${user.org_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.hasData) {
            setScanData(data.data);
            setScanState('complete');
          }
        })
        .catch(console.error);

      // Fetch SRE credentials
      fetch(`/api/sre/credentials?orgId=${user.org_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setCredentials(data.credentials || []);
          }
        })
        .catch(console.error);

      // Fetch monitor details
      fetch(`/api/sre/monitors?orgId=${user.org_id}&platform=Datadog`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setMonitors(data.monitors || []);
          }
        })
        .catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const isConfigured = (platform: string) => credentials.some(c => c.platform === platform && c.is_configured);
  const configuredCount = Object.keys(srePlatforms).filter(p => isConfigured(p)).length;

  const saveCredential = async () => {
    if (!configPlatform || !configForm.apiKey) return;
    setConfigLoading(true);
    setValidationStatus(null);

    try {
      // Validate credentials
      const validateRes = await fetch('/api/sre/credentials/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: configPlatform,
          apiKey: configForm.apiKey,
          apiSecret: configForm.apiSecret || null,
          endpointUrl: configForm.endpointUrl || null,
          appKey: configForm.appKey || null
        })
      });
      const validateData = await validateRes.json();

      if (!validateData.success) {
        setValidationStatus({ success: false, message: validateData.message });
        setConfigLoading(false);
        return;
      }

      setValidationStatus({ success: true, message: validateData.message });

      // Save credentials
      const res = await fetch('/api/sre/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: user.org_id,
          platform: configPlatform,
          apiKey: configForm.apiKey,
          apiSecret: configForm.apiSecret || null,
          endpointUrl: configForm.endpointUrl || null,
          appKey: configForm.appKey || null
        })
      });
      const data = await res.json();

      if (data.success) {
        const credsRes = await fetch(`/api/sre/credentials?orgId=${user.org_id}`);
        const credsData = await credsRes.json();
        if (credsData.success) setCredentials(credsData.credentials || []);

        setTimeout(() => {
          setConfigPlatform(null);
          setConfigForm({ apiKey: '', apiSecret: '', endpointUrl: '', appKey: '' });
          setValidationStatus(null);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setValidationStatus({ success: false, message: 'Connection error. Please try again.' });
    } finally {
      setConfigLoading(false);
    }
  };

  const removeCredential = async (platform: string) => {
    try {
      await fetch('/api/sre/credentials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: user.org_id, platform })
      });
      setCredentials(credentials.filter(c => c.platform !== platform));
    } catch (err) {
      console.error(err);
    }
  };

  const runScan = async () => {
    if (configuredCount === 0) {
      setShowConfig(true);
      return;
    }

    const configuredPlatforms = Object.keys(srePlatforms).filter(p => isConfigured(p)).join(',');

    // Start background scan using global context
    const scanId = await startScan('sre', configuredPlatforms, user?.org_id);

    // Update local state to show that scan has been initiated
    setScanState('scanning');
    setScanData(null);
    setLogs(['[SYSTEM] Scan started in background - you can navigate freely!']);

    // Poll scan status to update local display
    const pollInterval = setInterval(() => {
      const scan = Array.from(activeScans.values()).find(s => s.scanId === scanId);

      if (scan) {
        setLogs(scan.logs);

        if (scan.status === 'complete') {
          setScanData(scan.data);
          setScanState('complete');
          clearInterval(pollInterval);

          // Fetch monitor details after scan completes
          fetch(`/api/sre/monitors?orgId=${user?.org_id}&platform=Datadog`)
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                setMonitors(data.monitors || []);
              }
            })
            .catch(console.error);
        } else if (scan.status === 'error') {
          setScanState('idle');
          clearInterval(pollInterval);
        }
      }
    }, 500);

    // Cleanup interval on unmount
    return () => clearInterval(pollInterval);
  };

  const getBandFromScore = (score: number) => {
    if (score >= 80) return 'Advanced';
    if (score >= 60) return 'Maturing';
    if (score >= 40) return 'Developing';
    if (score >= 20) return 'Beginner';
    return 'Minimal';
  };

  // Build radar chart data from assessments
  const radarData = scanData?.sreAssessments?.map((a: any) => ({
    domain: a.skillName,
    score: a.score ?? 0,
    band: getBandFromScore(a.score ?? 0)
  })) || sreMaturityData;

  // Validate chart data has valid numeric values
  const hasValidChartData = (data: any) => {
    if (!data || !Array.isArray(data) || data.length === 0) return false;
    // Check if at least one item has at least one numeric value
    return data.some((item: any) => {
      if (!item || typeof item !== 'object') return false;
      return Object.values(item).some(val => typeof val === 'number' && !isNaN(val) && isFinite(val));
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-500" /> SRE Agent
          </h2>
          <p className="text-sm text-zinc-400 mt-1">Connect your SRE tools to assess reliability maturity across all platforms.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border",
              showConfig ? "bg-white/10 text-white border-white/20" : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
            )}
          >
            <Settings className="w-4 h-4" /> Configure ({configuredCount}/7)
          </button>
          {scanState !== 'scanning' && (
            <button
              onClick={runScan}
              disabled={configuredCount === 0}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors",
                configuredCount > 0
                  ? "bg-purple-600 hover:bg-purple-500 text-white"
                  : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
              )}
            >
              <Play className="w-4 h-4" /> {scanState === 'complete' ? 'Run New Assessment' : 'Run SRE Assessment'}
            </button>
          )}
        </div>
      </div>

      {/* SRE Tools Configuration Panel */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-dashed border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-purple-500" /> SRE Tool Credentials
                </h3>
                <p className="text-xs text-zinc-500">Connect your observability and incident management tools</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(srePlatforms).map(([platform, config]) => {
                  const Icon = config.icon;
                  const configured = isConfigured(platform);

                  return (
                    <div
                      key={platform}
                      className={cn(
                        "p-4 rounded-lg border transition-all",
                        configured
                          ? "bg-purple-500/5 border-purple-500/30"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("w-5 h-5", configured ? "text-purple-400" : "text-zinc-500")} />
                          <span className="text-sm font-medium text-white">{config.name}</span>
                        </div>
                        {configured ? (
                          <Check className="w-4 h-4 text-purple-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-zinc-500" />
                        )}
                      </div>

                      {configured ? (
                        <div className="space-y-2">
                          <p className="text-xs text-purple-400">Configured</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setConfigPlatform(platform);
                                setConfigForm({ apiKey: '', apiSecret: '', endpointUrl: '', appKey: '' });
                              }}
                              className="text-xs text-zinc-400 hover:text-white transition-colors"
                            >
                              Update
                            </button>
                            <button
                              onClick={() => removeCredential(platform)}
                              className="text-xs text-red-400 hover:text-red-300 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setConfigPlatform(platform);
                            setConfigForm({ apiKey: '', apiSecret: '', endpointUrl: '', appKey: '' });
                          }}
                          className="w-full text-xs text-purple-400 hover:text-purple-300 transition-colors text-left"
                        >
                          + Add Credentials
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Credential Form Modal */}
              {configPlatform && (
                <div className="mt-4 p-4 bg-black/40 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-white">Configure {configPlatform}</h4>
                    <button onClick={() => setConfigPlatform(null)} className="text-zinc-500 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">API Key</label>
                      <input
                        type="password"
                        value={configForm.apiKey}
                        onChange={(e) => setConfigForm({ ...configForm, apiKey: e.target.value })}
                        placeholder="Enter API key..."
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                      />
                    </div>

                    {srePlatforms[configPlatform]?.needsAppKey && (
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Application Key</label>
                        <input
                          type="password"
                          value={configForm.appKey}
                          onChange={(e) => setConfigForm({ ...configForm, appKey: e.target.value })}
                          placeholder="Enter application key..."
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                        />
                      </div>
                    )}

                    {srePlatforms[configPlatform]?.needsSecret && (
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">API ID</label>
                        <input
                          type="password"
                          value={configForm.apiSecret}
                          onChange={(e) => setConfigForm({ ...configForm, apiSecret: e.target.value })}
                          placeholder="Enter API ID..."
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                        />
                      </div>
                    )}

                    {srePlatforms[configPlatform]?.needsEndpoint && (
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Endpoint URL</label>
                        <input
                          type="text"
                          value={configForm.endpointUrl}
                          onChange={(e) => setConfigForm({ ...configForm, endpointUrl: e.target.value })}
                          placeholder={configPlatform === 'Prometheus' ? 'http://prometheus:9090' : 'https://grafana.company.com'}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                        />
                      </div>
                    )}

                    {validationStatus && (
                      <div className={cn(
                        "p-3 rounded-lg flex items-center gap-2 text-sm",
                        validationStatus.success
                          ? "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                          : "bg-red-500/10 border border-red-500/20 text-red-400"
                      )}>
                        {validationStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        <span>{validationStatus.message}</span>
                      </div>
                    )}

                    <button
                      onClick={saveCredential}
                      disabled={configLoading || !configForm.apiKey}
                      className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                    >
                      {configLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {configLoading ? 'Validating...' : 'Validate & Save'}
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanning Progress */}
      {scanState === 'scanning' && (
        <Card className="p-5 flex flex-col gap-4 bg-purple-500/10 border-purple-500/20">
          <div className="flex items-start gap-4">
            <Loader2 className="w-5 h-5 animate-spin text-purple-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-purple-400 font-medium text-sm mb-2">SRE Assessment in Progress</h3>
              <p className="text-xs text-purple-500/70 font-mono">{logs[logs.length - 1] || 'Initializing...'}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Terminal Output */}
      {(scanState === 'scanning' || (scanState === 'complete' && logs.length > 0)) && (
        <Card className="bg-black border-zinc-800 font-mono text-xs p-4 h-48 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4 text-zinc-500 border-b border-zinc-800 pb-2">
            <Terminal className="w-4 h-4" /> SRE Assessment Output
            {scanState === 'scanning' && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
          </div>
          <div className="space-y-1.5">
            {logs.map((log, i) => (
              <div key={i} className={cn(
                log.includes('[ERROR]') ? 'text-red-400' :
                log.includes('[SYSTEM]') ? 'text-purple-400' :
                log.includes('[DATADOG]') ? 'text-violet-400' :
                log.includes('[PAGERDUTY]') ? 'text-green-400' :
                log.includes('[VICTOROPS]') ? 'text-red-400' :
                log.includes('[PROMETHEUS]') ? 'text-orange-400' :
                log.includes('[GRAFANA]') ? 'text-amber-400' :
                log.includes('[OPSGENIE]') ? 'text-blue-400' :
                log.includes('[NEWRELIC]') ? 'text-teal-400' :
                'text-zinc-400'
              )}>
                {log}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </Card>
      )}

      {/* Results View */}
      {scanState === 'complete' && scanData ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-2xl font-light text-white">{scanData.summary?.platformsScanned || 0}</div>
              <div className="text-xs text-zinc-500 uppercase mt-1">Platforms Scanned</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-light text-purple-400">{scanData.summary?.overallMaturity || 0}/100</div>
              <div className="text-xs text-zinc-500 uppercase mt-1">SRE Agent Score</div>
            </Card>
            <Card className="p-4 border-red-500/20 bg-red-500/5">
              <div className="text-2xl font-light text-red-400">{scanData.summary?.criticalFindings || 0}</div>
              <div className="text-xs text-red-500/70 uppercase mt-1">Critical Findings</div>
            </Card>
            <Card className="p-4 border-amber-500/20 bg-amber-500/5">
              <div className="text-2xl font-light text-amber-400">{scanData.summary?.highFindings || 0}</div>
              <div className="text-xs text-amber-500/70 uppercase mt-1">High Findings</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Radar Chart */}
            <Card className="lg:col-span-1 flex flex-col items-center justify-center min-h-[400px]">
              <h3 className="text-sm font-medium text-zinc-400 uppercase mb-4">SRE Agent Radar</h3>
              {hasValidChartData(radarData) ? (
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData.slice(0, 8)}>
                      <PolarGrid stroke="#333" />
                      <PolarAngleAxis dataKey="domain" tick={{ fill: '#888', fontSize: 9 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Maturity" dataKey="score" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center text-zinc-500 text-sm py-8">
                  No assessment data available
                </div>
              )}
            </Card>

            {/* SRE Assessments Table */}
            <Card className="lg:col-span-2 p-0 overflow-hidden">
              <div className="p-4 border-b border-white/10 bg-white/5">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-purple-400" /> SRE Domain Assessment
                </h3>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-zinc-900">
                    <tr className="border-b border-white/10">
                      <th className="p-3 text-xs font-medium text-zinc-400 uppercase">Domain</th>
                      <th className="p-3 text-xs font-medium text-zinc-400 uppercase">Score</th>
                      <th className="p-3 text-xs font-medium text-zinc-400 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {scanData.sreAssessments?.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3">
                          <div className="text-sm text-white font-medium">{item.skillName}</div>
                          <div className="text-xs text-zinc-500">{item.category}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-16 bg-white/10 rounded-full h-1.5">
                              <div
                                className={cn(
                                  "h-1.5 rounded-full",
                                  item.score >= 70 ? "bg-emerald-500" : item.score >= 40 ? "bg-amber-500" : "bg-red-500"
                                )}
                                style={{ width: `${item.score}%` }}
                              ></div>
                            </div>
                            <span className="font-mono text-xs text-zinc-400">{item.score}/100</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <MetricBadge band={getBandFromScore(item.score)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Platform Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scanData.platforms?.map((platform: any, idx: number) => {
              const config = srePlatforms[platform.name];
              const Icon = config?.icon || Activity;
              return (
                <Card key={idx} className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Icon className="w-5 h-5 text-purple-400" />
                    <span className="text-white font-medium">{platform.name}</span>
                    <span className={cn(
                      "ml-auto px-2 py-0.5 rounded text-[10px] font-bold",
                      platform.status === 'connected' ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    )}>
                      {platform.status}
                    </span>
                  </div>
                  <div className="text-2xl font-light text-white mb-2">{platform.maturityScore}/100</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {platform.metrics && Object.entries(platform.metrics).slice(0, 4).map(([key, value]: [string, any]) => (
                      <div key={key} className="bg-white/5 rounded p-2">
                        <div className="text-zinc-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                        <div className="text-white font-mono">{value}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Findings & Remediation */}
          {scanData.sreAssessments?.filter((a: any) => a.status !== 'pass').length > 0 && (
            <Card className="p-0 overflow-hidden">
              <div className="p-4 border-b border-white/10 bg-white/5">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Findings & Remediation
                </h3>
              </div>
              <div className="divide-y divide-white/5">
                {scanData.sreAssessments?.filter((a: any) => a.status !== 'pass').map((assessment: any, idx: number) => (
                  <div key={idx} className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold",
                        assessment.status === 'fail' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                      )}>
                        {assessment.score}/100
                      </span>
                      <span className="text-sm font-medium text-white">{assessment.skillName}</span>
                    </div>
                    {assessment.findings?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {assessment.findings.map((f: string, fIdx: number) => (
                          <p key={fIdx} className="text-xs text-zinc-400 pl-4 border-l border-white/10">{f}</p>
                        ))}
                      </div>
                    )}
                    {assessment.remediation && (
                      <div className="mt-3 p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg flex items-start justify-between gap-4">
                        <p className="text-xs text-purple-300 flex items-start gap-2 flex-1">
                          <Wrench className="w-3 h-3 mt-0.5 shrink-0" />
                          <span><strong>Remediation:</strong> {assessment.remediation}</span>
                        </p>
                        {assessment.repo && (
                          <AutoPRButton
                            user={user}
                            finding={{
                              type: assessment.skillId || 'SRE',
                              severity: assessment.status === 'fail' ? 'HIGH' : 'MEDIUM',
                              message: assessment.skillName + ': ' + (assessment.findings?.[0] || assessment.remediation),
                              remediation: assessment.remediation,
                              platform: assessment.sourcePlatform,
                              repo: assessment.repo
                            }}
                            repoFullName={assessment.repo}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Monitor Ownership Details */}
          {monitors.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-purple-400" /> Datadog Monitor Ownership ({monitors.length})
                </h3>
                <p className="text-xs text-zinc-500">Team assignments and creator information</p>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-zinc-900 z-10">
                    <tr className="border-b border-white/10">
                      <th className="p-3 text-xs font-medium text-zinc-400 uppercase">Monitor</th>
                      <th className="p-3 text-xs font-medium text-zinc-400 uppercase">Type</th>
                      <th className="p-3 text-xs font-medium text-zinc-400 uppercase">Owner</th>
                      <th className="p-3 text-xs font-medium text-zinc-400 uppercase">Team</th>
                      <th className="p-3 text-xs font-medium text-zinc-400 uppercase">State</th>
                      <th className="p-3 text-xs font-medium text-zinc-400 uppercase">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {monitors.map((monitor: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3">
                          <div className="text-sm text-white font-medium max-w-[300px] truncate" title={monitor.monitor_name}>
                            {monitor.monitor_name}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono">#{monitor.monitor_id}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-white/5 rounded text-xs text-zinc-400 font-mono">
                            {monitor.monitor_type}
                          </span>
                        </td>
                        <td className="p-3">
                          {monitor.creator_name ? (
                            <div>
                              <div className="text-sm text-white">{monitor.creator_name}</div>
                              <div className="text-xs text-zinc-500">{monitor.creator_email}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600">Unknown</span>
                          )}
                        </td>
                        <td className="p-3">
                          {monitor.team ? (
                            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-xs">
                              {monitor.team}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-600">Unassigned</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={cn(
                            "px-2 py-1 rounded text-xs font-medium",
                            monitor.state === 'OK' ? 'bg-emerald-500/10 text-emerald-400' :
                            monitor.state === 'Alert' ? 'bg-red-500/10 text-red-400' :
                            monitor.state === 'Warn' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-zinc-500/10 text-zinc-400'
                          )}>
                            {monitor.state}
                          </span>
                        </td>
                        <td className="p-3">
                          {monitor.priority !== null ? (
                            <span className="text-sm text-white font-mono">P{monitor.priority}</span>
                          ) : (
                            <span className="text-xs text-zinc-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </motion.div>
      ) : (
        /* Default View when no data */
        !showConfig && scanState === 'idle' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 flex flex-col items-center justify-center min-h-[400px]">
              {hasValidChartData(sreMaturityData) ? (
                <>
                  <div className="w-full h-[300px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={sreMaturityData}>
                        <PolarGrid stroke="#333" />
                        <PolarAngleAxis dataKey="domain" tick={{ fill: '#888', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Maturity" dataKey="score" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-zinc-500 text-center mt-4">Sample data shown. Configure tools and run assessment for real metrics.</p>
                </>
              ) : (
                <div className="text-center text-zinc-500 text-sm py-8">
                  No sample data available
                </div>
              )}
            </Card>

            <Card className="lg:col-span-2 p-0 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">SRE Domain</th>
                    <th className="p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Score</th>
                    <th className="p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Band</th>
                    <th className="p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sreMaturityData.map((item) => (
                    <tr key={item.domain} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-sm text-white font-medium">{item.domain}</td>
                      <td className="p-4 text-sm text-zinc-300">
                        <div className="flex items-center gap-3">
                          <div className="w-16 bg-white/10 rounded-full h-1.5">
                            <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${item.score}%` }}></div>
                          </div>
                          <span className="font-mono text-xs">{item.score}/100</span>
                        </div>
                      </td>
                      <td className="p-4"><MetricBadge band={item.band} /></td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <TrendIcon trend={item.trend} />
                          {item.change && <span className="text-xs text-zinc-500">{item.change}</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )
      )}
    </div>
  );
};

// --- Dev Productivity View ---

const sampleDevMetrics = [
  { developer: "Sarah Chen", aiTool: "GitHub Copilot", feature: "Auth Module", totalLines: 1250, aiLines: 875, aiPercent: 70, techDebt: 12, tokens: 45000, cost: 13.50, quality: 88, bugs: 1 },
  { developer: "James Wilson", aiTool: "Cursor", feature: "Payment Gateway", totalLines: 890, aiLines: 712, aiPercent: 80, techDebt: 18, tokens: 62000, cost: 18.60, quality: 82, bugs: 3 },
  { developer: "Priya Patel", aiTool: "Claude Code", feature: "Dashboard UI", totalLines: 2100, aiLines: 1470, aiPercent: 70, techDebt: 8, tokens: 38000, cost: 11.40, quality: 92, bugs: 0 },
  { developer: "Mike Torres", aiTool: "Codex", feature: "API Endpoints", totalLines: 670, aiLines: 335, aiPercent: 50, techDebt: 22, tokens: 55000, cost: 16.50, quality: 75, bugs: 4 },
  { developer: "Lisa Park", aiTool: "Dira", feature: "Data Pipeline", totalLines: 1500, aiLines: 1200, aiPercent: 80, techDebt: 10, tokens: 41000, cost: 12.30, quality: 90, bugs: 1 },
];

const sampleAidlcMetrics = {
  aiAdoptionRate: 78,
  codeAcceptanceRate: 72,
  timeToFirstCommit: 2.5,
  aiAssistedVelocity: 34,
  reworkRatio: 15,
  costPerFeature: 14.46,
  developerSatisfaction: 8.2,
  codeReviewTime: 3.8,
  deploymentFrequency: 12,
  leadTime: 18,
};

const sampleToolComparison = [
  { tool: "GitHub Copilot", avgQuality: 85, avgAiPercent: 70, totalCost: 135.00, adoptionRate: 82, color: "#10b981" },
  { tool: "Cursor", avgQuality: 83, avgAiPercent: 78, totalCost: 186.00, adoptionRate: 65, color: "#8b5cf6" },
  { tool: "Claude Code", avgQuality: 92, avgAiPercent: 72, totalCost: 114.00, adoptionRate: 58, color: "#f59e0b" },
  { tool: "Codex", avgQuality: 76, avgAiPercent: 52, totalCost: 165.00, adoptionRate: 40, color: "#ef4444" },
  { tool: "Dira", avgQuality: 90, avgAiPercent: 80, totalCost: 123.00, adoptionRate: 35, color: "#06b6d4" },
];

const sampleCostTrend = [
  { sprint: "Sprint 1", cost: 52.30, aiPercent: 45 },
  { sprint: "Sprint 2", cost: 58.10, aiPercent: 52 },
  { sprint: "Sprint 3", cost: 61.40, aiPercent: 58 },
  { sprint: "Sprint 4", cost: 55.80, aiPercent: 63 },
  { sprint: "Sprint 5", cost: 72.30, aiPercent: 70 },
  { sprint: "Sprint 6", cost: 68.90, aiPercent: 74 },
];

const CHART_COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

const DevProductivityView = ({ user }: { user: any }) => {
  const { startScan, activeScans } = useScanContext();
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'complete'>('idle');
  const [dashboardData, setDashboardData] = useState<any>(null);

  const devMetrics = dashboardData?.devMetrics || sampleDevMetrics;
  const aidlcMetrics = dashboardData?.aidlcMetrics || sampleAidlcMetrics;
  const toolComparison = dashboardData?.toolComparison || sampleToolComparison;
  const costTrend = dashboardData?.costTrend || sampleCostTrend;

  useEffect(() => {
    if (user?.org_id) {
      fetch(`/api/devprod/dashboard?orgId=${user.org_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.hasData) {
            setDashboardData(data.data);
            setScanState('complete');
          }
        })
        .catch(console.error);
    }
  }, [user]);

  const runScan = async () => {
    setScanState('scanning');
    try {
      const scanId = await startScan('devprod', 'all', user?.org_id);
      const pollInterval = setInterval(() => {
        const scan = Array.from(activeScans.values()).find(s => s.scanId === scanId);
        if (scan) {
          if (scan.status === 'complete') {
            setDashboardData(scan.data);
            setScanState('complete');
            clearInterval(pollInterval);
          } else if (scan.status === 'error') {
            setScanState('idle');
            clearInterval(pollInterval);
          }
        }
      }, 500);
    } catch {
      setScanState('idle');
    }
  };

  // Computed summary metrics
  const totalAiLines = devMetrics.reduce((s: number, d: any) => s + d.aiLines, 0);
  const totalLines = devMetrics.reduce((s: number, d: any) => s + d.totalLines, 0);
  const avgAiPercent = totalLines > 0 ? Math.round((totalAiLines / totalLines) * 100) : 0;
  const avgTechDebt = Math.round(devMetrics.reduce((s: number, d: any) => s + d.techDebt, 0) / devMetrics.length);
  const totalTokens = devMetrics.reduce((s: number, d: any) => s + d.tokens, 0);
  const tokenEfficiency = totalTokens > 0 ? ((totalLines / totalTokens) * 1000).toFixed(1) : '0';
  const totalCost = devMetrics.reduce((s: number, d: any) => s + d.cost, 0).toFixed(2);

  // Chart data
  const barChartData = devMetrics.map((d: any) => ({ name: d.developer.split(' ')[0], aiPercent: d.aiPercent, quality: d.quality }));
  const pieData = toolComparison.map((t: any) => ({ name: t.tool, value: t.totalCost }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">AI Developer Productivity Agent</h2>
          <p className="text-sm text-zinc-400 mt-1">Analyze developer productivity with AI code assistants - track code generation, tech debt, costs, and AIDLC metrics</p>
        </div>
        <button
          onClick={runScan}
          disabled={scanState === 'scanning'}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            scanState === 'scanning'
              ? "bg-white/5 text-zinc-500 cursor-not-allowed"
              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
          )}
        >
          {scanState === 'scanning' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {scanState === 'scanning' ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Code2 className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs text-zinc-400 uppercase tracking-wider">AI Code Generation</span>
          </div>
          <div className="text-3xl font-light text-white">{avgAiPercent}%</div>
          <div className="flex items-center gap-1 mt-1 text-xs text-emerald-400">
            <ArrowUpRight className="w-3 h-3" /> +5% from last sprint
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-xs text-zinc-400 uppercase tracking-wider">Tech Debt Index</span>
          </div>
          <div className="text-3xl font-light text-white">{avgTechDebt}</div>
          <div className="flex items-center gap-1 mt-1 text-xs text-amber-400">
            <TrendingDown className="w-3 h-3" /> Lower is better
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xs text-zinc-400 uppercase tracking-wider">Token Efficiency</span>
          </div>
          <div className="text-3xl font-light text-white">{tokenEfficiency}</div>
          <div className="text-xs text-zinc-500 mt-1">Lines per 1K tokens</div>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-xs text-zinc-400 uppercase tracking-wider">Total AI Cost</span>
          </div>
          <div className="text-3xl font-light text-white">${totalCost}</div>
          <div className="text-xs text-zinc-500 mt-1">Across all developers</div>
        </Card>
      </div>

      {/* Developer Leaderboard */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" />
            Developer Leaderboard
          </h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Developer</th>
              <th className="p-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">AI Tool</th>
              <th className="p-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Feature</th>
              <th className="p-3 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">Total / AI Lines</th>
              <th className="p-3 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">AI %</th>
              <th className="p-3 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">Tech Debt</th>
              <th className="p-3 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">Tokens</th>
              <th className="p-3 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">Cost ($)</th>
              <th className="p-3 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">Quality</th>
              <th className="p-3 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">Bugs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {devMetrics.map((dev: any, i: number) => (
              <tr key={i} className={cn("hover:bg-white/[0.02] transition-colors", i % 2 === 1 ? "bg-white/[0.01]" : "")}>
                <td className="p-3 text-sm text-white font-medium">{dev.developer}</td>
                <td className="p-3 text-sm text-zinc-400">{dev.aiTool}</td>
                <td className="p-3 text-sm text-zinc-400">{dev.feature}</td>
                <td className="p-3 text-sm text-zinc-300 text-right font-mono">{dev.totalLines.toLocaleString()} / {dev.aiLines.toLocaleString()}</td>
                <td className="p-3 text-right">
                  <span className={cn("px-2 py-0.5 rounded text-xs font-medium", dev.aiPercent >= 70 ? "bg-emerald-500/10 text-emerald-400" : dev.aiPercent >= 50 ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400")}>
                    {dev.aiPercent}%
                  </span>
                </td>
                <td className="p-3 text-right">
                  <span className={cn("text-sm font-mono", dev.techDebt <= 10 ? "text-emerald-400" : dev.techDebt <= 15 ? "text-amber-400" : "text-red-400")}>
                    {dev.techDebt}
                  </span>
                </td>
                <td className="p-3 text-sm text-zinc-400 text-right font-mono">{(dev.tokens / 1000).toFixed(0)}K</td>
                <td className="p-3 text-sm text-zinc-300 text-right font-mono">${dev.cost.toFixed(2)}</td>
                <td className="p-3 text-right">
                  <span className={cn("text-sm font-medium", dev.quality >= 90 ? "text-emerald-400" : dev.quality >= 80 ? "text-amber-400" : "text-red-400")}>
                    {dev.quality}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <span className={cn("text-sm font-mono", dev.bugs === 0 ? "text-emerald-400" : dev.bugs <= 2 ? "text-amber-400" : "text-red-400")}>
                    {dev.bugs}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* AI Tool Comparison */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-zinc-400" />
          AI Tool Comparison
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {toolComparison.map((tool: any, i: number) => (
            <Card key={i} className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5" style={{ backgroundColor: tool.color }} />
              <div className="text-sm font-medium text-white mb-3">{tool.tool}</div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Code Quality</span>
                  <span className={cn(tool.avgQuality >= 85 ? "text-emerald-400" : tool.avgQuality >= 75 ? "text-amber-400" : "text-red-400")}>{tool.avgQuality}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Avg AI %</span>
                  <span className="text-zinc-300">{tool.avgAiPercent}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Total Cost</span>
                  <span className="text-zinc-300">${tool.totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Adoption</span>
                  <span className={cn(tool.adoptionRate >= 60 ? "text-emerald-400" : "text-amber-400")}>{tool.adoptionRate}%</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* AIDLC Metrics Panel */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Brain className="w-4 h-4 text-zinc-400" />
          AIDLC Metrics (AI Development Life Cycle)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'AI Adoption Rate', value: `${aidlcMetrics.aiAdoptionRate}%`, good: aidlcMetrics.aiAdoptionRate >= 70 },
            { label: 'Code Acceptance Rate', value: `${aidlcMetrics.codeAcceptanceRate}%`, good: aidlcMetrics.codeAcceptanceRate >= 65 },
            { label: 'Time to First Commit', value: `${aidlcMetrics.timeToFirstCommit}h`, good: aidlcMetrics.timeToFirstCommit <= 3 },
            { label: 'AI-Assisted Velocity', value: `${aidlcMetrics.aiAssistedVelocity} SP/sprint`, good: aidlcMetrics.aiAssistedVelocity >= 30 },
            { label: 'Rework Ratio', value: `${aidlcMetrics.reworkRatio}%`, good: aidlcMetrics.reworkRatio <= 20 },
            { label: 'Cost per Feature', value: `$${aidlcMetrics.costPerFeature}`, good: aidlcMetrics.costPerFeature <= 20 },
            { label: 'Developer Satisfaction', value: `${aidlcMetrics.developerSatisfaction}/10`, good: aidlcMetrics.developerSatisfaction >= 7 },
            { label: 'Code Review Time', value: `${aidlcMetrics.codeReviewTime}h`, good: aidlcMetrics.codeReviewTime <= 4 },
          ].map((metric, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="flex flex-col items-center text-center py-5">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{metric.label}</div>
                <div className={cn("text-2xl font-light", metric.good ? "text-emerald-400" : "text-amber-400")}>
                  {metric.value}
                </div>
                <div className={cn("w-2 h-2 rounded-full mt-2", metric.good ? "bg-emerald-500" : "bg-amber-500")} />
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart: AI Code % by Developer */}
        <Card>
          <h3 className="text-sm font-medium text-white mb-4">AI Code % by Developer</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Bar dataKey="aiPercent" fill="#10b981" radius={[4, 4, 0, 0]} name="AI %" />
              <Bar dataKey="quality" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Quality" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Line Chart: Cost Trend */}
        <Card>
          <h3 className="text-sm font-medium text-white mb-4">Cost Trend Over Sprints</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={costTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="sprint" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 4 }} name="Cost ($)" />
              <Line type="monotone" dataKey="aiPercent" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} name="AI %" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Pie/Donut Chart: Cost Distribution by AI Tool */}
      <Card>
        <h3 className="text-sm font-medium text-white mb-4">Cost Distribution by AI Tool</h3>
        <div className="flex items-center justify-center gap-8">
          <ResponsiveContainer width="50%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((_: any, index: number) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {pieData.map((entry: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="text-zinc-400">{entry.name}</span>
                <span className="text-zinc-300 font-mono">${entry.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const { startScan, activeScans } = useScanContext();

  const [authState, setAuthState] = useState<'login' | 'signup' | 'authenticated'>('login');
  const [user, setUser] = useState<any>(null);

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [licenseType, setLicenseType] = useState('trial');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Executive Summary', icon: LayoutDashboard },
    { id: 'cicd', label: 'CI/CD Agent', icon: GitMerge },
    { id: 'chat', label: 'DIA Assistant', icon: MessageSquare },
    { id: 'iac', label: 'IaC Intelligence', icon: Server },
    { id: 'sre', label: 'SRE Agent', icon: Shield },
    { id: 'rag', label: 'RAG Training', icon: Brain },
    { id: 'devprod', label: 'AI Dev Productivity', icon: Code2 },
  ];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError('');

    const endpoint = authState === 'signup' ? '/api/auth/signup' : '/api/auth/login';
    const payload = authState === 'signup' 
      ? { email, password, orgName, licenseType }
      : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setUser(data.user);
        setAuthState('authenticated');
      } else {
        setAuthError(data.message);
      }
    } catch (err) {
      setAuthError('Connection failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authState !== 'authenticated') {
    return (
      <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans flex items-center justify-center p-4 selection:bg-emerald-500/30">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute inset-0 bg-radial-at-t from-emerald-500/5 via-transparent to-transparent"></div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <Terminal className="w-6 h-6 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">DIA Platform</h1>
            <p className="text-sm text-zinc-500 mt-1 italic font-serif">DevOps Intelligence Agent</p>
          </div>

          <Card className="backdrop-blur-xl bg-zinc-900/80 border-white/5 shadow-2xl">
            <div className="flex gap-4 mb-6 border-b border-white/10 pb-4">
              <button 
                onClick={() => { setAuthState('login'); setAuthError(''); }}
                className={cn("text-sm font-medium transition-colors", authState === 'login' ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300")}
              >
                Sign In
              </button>
              <button 
                onClick={() => { setAuthState('signup'); setAuthError(''); }}
                className={cn("text-sm font-medium transition-colors", authState === 'signup' ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300")}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {authState === 'signup' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Organization Name</label>
                    <input type="text" required value={orgName} onChange={e => setOrgName(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50" placeholder="Acme Corp" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">License Tier</label>
                    <select value={licenseType} onChange={e => setLicenseType(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50 appearance-none">
                      <option value="trial">14-Day Free Trial</option>
                      <option value="licensed">Enterprise License</option>
                    </select>
                  </div>
                </>
              )}
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Work Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50" placeholder="admin@company.com" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50" placeholder="••••••••" />
              </div>

              {authError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {authError}
                </div>
              )}

              <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 mt-6">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (authState === 'login' ? 'Access Console' : 'Provision Account')}
              </button>
            </form>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans flex flex-col md:flex-row selection:bg-emerald-500/30">
      {/* Background Scan Status Bar */}
      <BackgroundScanBar />

      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-white/10 bg-[#0a0a0a] flex flex-col" style={{ marginTop: activeScans.size > 0 ? '60px' : '0' }}>
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center">
              <Terminal className="w-4 h-4 text-emerald-500" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">DIA</h1>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Platform Intelligence</p>
        </div>

        <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="text-xs font-medium text-white truncate">{user?.orgName}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider", user?.licenseType === 'licensed' ? "bg-purple-500/20 text-purple-400" : "bg-amber-500/20 text-amber-400")}>
              {user?.licenseType}
            </span>
            <span className="text-[10px] text-zinc-500 truncate">{user?.email}</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-white/10 text-white" 
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-emerald-400" : "text-zinc-500")} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="bg-white/5 rounded-lg p-3 border border-white/5 mb-3">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Scan Status</div>
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              Live Monitoring
            </div>
            <div className="text-[10px] text-zinc-600 font-mono mt-2">Last sweep: 4m ago</div>
          </div>
          <button onClick={() => setAuthState('login')} className="w-full text-left px-3 py-2 text-xs text-zinc-500 hover:text-white transition-colors">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'overview' && <OverviewView user={user} />}
          {activeTab === 'cicd' && <CicdAgentView user={user} />}
          {activeTab === 'chat' && <AgentChatView user={user} />}
          {activeTab === 'iac' && <IacView />}
          {activeTab === 'rag' && <RAGTrainingPanel />}
          {activeTab === 'sre' && <SreView user={user} />}
          {activeTab === 'devprod' && <DevProductivityView user={user} />}
        </div>
      </main>
    </div>
  );
}
