import React, { useState, useEffect } from 'react';
import { Database, Download, Trash2, CheckCircle, XCircle, Loader2, BookOpen, Brain } from 'lucide-react';

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-[#111111] border border-white/10 rounded-xl p-6 ${className}`}>
    {children}
  </div>
);

const AGENT_TYPES = [
  { id: 'iac', name: 'IaC Agent', icon: '🏗️', description: 'Infrastructure as Code best practices' },
  { id: 'sre', name: 'SRE Agent', icon: '🛡️', description: 'Site Reliability Engineering patterns' },
  { id: 'cicd', name: 'CI/CD Agent', icon: '🔄', description: 'Continuous Integration & Deployment' },
  { id: 'aidlc', name: 'AI DLC Agent', icon: '🤖', description: 'AI Development Lifecycle metrics' },
  { id: 'aidc', name: 'AI Developer', icon: '👨‍💻', description: 'AI-assisted developer productivity' },
  { id: 'devprod', name: 'Dev Productivity', icon: '📊', description: 'AI code assistant analytics & AIDLC metrics' },
];

export const RAGTrainingPanel = () => {
  const [selectedAgent, setSelectedAgent] = useState('iac');
  const [datasets, setDatasets] = useState<any>({});
  const [stats, setStats] = useState<any[]>([]);
  const [trainingStatus, setTrainingStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000); // Refresh every 3s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Load datasets
      const datasetsRes = await fetch('/api/rag/datasets');
      const datasetsData = await datasetsRes.json();
      if (datasetsData.success) {
        setDatasets(datasetsData.datasets);
      }

      // Load stats
      const statsRes = await fetch('/api/rag/stats');
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
      }

      // Load training status
      const statusRes = await fetch('/api/rag/training/status');
      const statusData = await statusRes.json();
      if (statusData.success) {
        setTrainingStatus(statusData.status);
      }
    } catch (error) {
      console.error('Error loading RAG data:', error);
    }
  };

  const trainDataset = async (agentType: string, datasetName: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/rag/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType,
          datasetName,
          maxDocs: 100
        })
      });

      const data = await res.json();
      if (data.success) {
        setTimeout(loadData, 1000);
      }
    } catch (error) {
      console.error('Error training:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearKnowledgeBase = async (agentType: string) => {
    if (!confirm(`Clear all knowledge for ${agentType} agent?`)) return;

    try {
      await fetch('/api/rag/knowledge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentType })
      });

      setTimeout(loadData, 1000);
    } catch (error) {
      console.error('Error clearing:', error);
    }
  };

  const getAgentStats = (agentType: string) => {
    return stats.find(s => s.agent_type === agentType);
  };

  const getAgentTrainingStatus = (agentType: string) => {
    return trainingStatus.filter(t => t.agent_type === agentType);
  };

  const selectedAgentConfig = AGENT_TYPES.find(a => a.id === selectedAgent);
  const agentDatasets = datasets[selectedAgent] || [];
  const agentStats = getAgentStats(selectedAgent);
  const agentTraining = getAgentTrainingStatus(selectedAgent);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3 mb-2">
          <Brain className="w-7 h-7 text-purple-400" />
          RAG Training & Knowledge Base
        </h2>
        <p className="text-zinc-400">
          Train agents with Hugging Face datasets for intelligent, context-aware responses
        </p>
      </div>

      {/* Agent Selection */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {AGENT_TYPES.map(agent => {
          const isSelected = selectedAgent === agent.id;
          const stats = getAgentStats(agent.id);

          return (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent.id)}
              className={`p-4 rounded-lg border transition-all ${
                isSelected
                  ? 'bg-purple-500/10 border-purple-500/50 ring-2 ring-purple-500/30'
                  : 'bg-[#111111] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="text-2xl mb-2">{agent.icon}</div>
              <div className="text-sm font-medium text-white mb-1">{agent.name}</div>
              {stats && (
                <div className="text-xs text-emerald-400">
                  {stats.doc_count} documents
                </div>
              )}
              {!stats && (
                <div className="text-xs text-zinc-500">Not trained</div>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Knowledge Base Stats */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-white">Knowledge Base</h3>
          </div>

          {agentStats ? (
            <div className="space-y-3">
              <div>
                <div className="text-sm text-zinc-400">Total Documents</div>
                <div className="text-2xl font-semibold text-white">{agentStats.doc_count}</div>
              </div>
              <div>
                <div className="text-sm text-zinc-400">Last Updated</div>
                <div className="text-sm text-white">
                  {new Date(agentStats.last_updated).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => clearKnowledgeBase(selectedAgent)}
                className="w-full mt-4 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear Knowledge Base
              </button>
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No knowledge base yet</p>
              <p className="text-xs mt-1">Train with datasets below</p>
            </div>
          )}
        </Card>

        {/* Training Status */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <Download className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white">Training Status</h3>
          </div>

          {agentTraining.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {agentTraining.map((training: any) => (
                <div
                  key={training.id}
                  className="p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm text-white">{training.dataset_name}</div>
                    <div className="flex items-center gap-2">
                      {training.status === 'running' && (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      )}
                      {training.status === 'completed' && (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      )}
                      {training.status === 'failed' && (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`text-xs px-2 py-1 rounded ${
                        training.status === 'running' ? 'bg-blue-500/10 text-blue-400' :
                        training.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {training.status}
                      </span>
                    </div>
                  </div>

                  {training.status === 'running' && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-zinc-400 mb-1">
                        <span>Progress</span>
                        <span>{training.documents_processed} / {training.total_documents}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{
                            width: `${(training.documents_processed / training.total_documents) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {training.status === 'failed' && training.error_message && (
                    <div className="mt-2 text-xs text-red-400">
                      Error: {training.error_message}
                    </div>
                  )}

                  {training.status === 'completed' && (
                    <div className="mt-2 text-xs text-emerald-400">
                      Completed {training.documents_processed} documents
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500">
              <Download className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No training history</p>
            </div>
          )}
        </Card>
      </div>

      {/* Available Datasets */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">
            Available Datasets for {selectedAgentConfig?.name}
          </h3>
          <span className="text-xs text-zinc-400">
            {agentDatasets.length} datasets available
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {agentDatasets.map((dataset: string) => {
            const isTraining = agentTraining.some(
              t => t.dataset_name === dataset && t.status === 'running'
            );

            return (
              <div
                key={dataset}
                className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-white mb-1">{dataset}</div>
                    <div className="text-xs text-zinc-400">{selectedAgentConfig?.description}</div>
                  </div>

                  <button
                    onClick={() => trainDataset(selectedAgent, dataset)}
                    disabled={loading || isTraining}
                    className="px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                  >
                    {isTraining ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Training...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        Train
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {agentDatasets.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <p className="text-sm">No datasets available for this agent type</p>
          </div>
        )}
      </Card>

      {/* Info Box */}
      <Card className="bg-gradient-to-br from-purple-500/5 to-blue-500/5 border-purple-500/20">
        <div className="flex items-start gap-3">
          <Brain className="w-5 h-5 text-purple-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-white mb-1">How RAG Training Works</h4>
            <p className="text-sm text-zinc-300 mb-3">
              Retrieval-Augmented Generation (RAG) enhances AI responses by retrieving relevant
              information from trained datasets before generating answers.
            </p>
            <ul className="text-sm text-zinc-400 space-y-1">
              <li>• <strong className="text-zinc-300">Train:</strong> Load datasets from Hugging Face into vector database</li>
              <li>• <strong className="text-zinc-300">Retrieve:</strong> Find relevant documents using semantic search</li>
              <li>• <strong className="text-zinc-300">Generate:</strong> AI uses retrieved context for accurate, informed answers</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};
