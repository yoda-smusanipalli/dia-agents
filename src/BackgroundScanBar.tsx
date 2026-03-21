import React, { useState } from 'react';
import { useScanContext } from './ScanContext';
import { Loader2, X, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Activity } from 'lucide-react';

export const BackgroundScanBar: React.FC = () => {
  const { activeScans, clearScan } = useScanContext();
  const [expandedScans, setExpandedScans] = useState<Set<string>>(new Set());

  const runningScans = Array.from(activeScans.values()).filter(s => s.status === 'running');
  const completedScans = Array.from(activeScans.values()).filter(s => s.status === 'complete');
  const errorScans = Array.from(activeScans.values()).filter(s => s.status === 'error');

  if (activeScans.size === 0) {
    return null;
  }

  const toggleExpanded = (scanId: string) => {
    setExpandedScans(prev => {
      const next = new Set(prev);
      if (next.has(scanId)) {
        next.delete(scanId);
      } else {
        next.add(scanId);
      }
      return next;
    });
  };

  const formatDuration = (startTime: number) => {
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const renderScan = (scan: any) => {
    const isExpanded = expandedScans.has(scan.scanId);
    const latestLogs = scan.logs.slice(-5);

    return (
      <div key={scan.scanId} className="border-b border-gray-700 last:border-0">
        <div
          className="flex items-center justify-between p-3 hover:bg-gray-700/30 cursor-pointer"
          onClick={() => toggleExpanded(scan.scanId)}
        >
          <div className="flex items-center gap-3 flex-1">
            {scan.status === 'running' && (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            )}
            {scan.status === 'complete' && (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            )}
            {scan.status === 'error' && (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {scan.type === 'cicd' ? 'CI/CD Discovery' : 'SRE Assessment'}
                </span>
                <span className="text-xs text-gray-400">
                  {scan.platforms}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {scan.status === 'running' && `Running ${formatDuration(scan.startTime)}`}
                {scan.status === 'complete' && `Completed in ${formatDuration(scan.startTime)}`}
                {scan.status === 'error' && scan.message}
              </div>
            </div>

            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              clearScan(scan.scanId);
            }}
            className="ml-2 p-1 hover:bg-gray-600 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {isExpanded && (
          <div className="px-3 pb-3 bg-gray-800/50">
            <div className="text-xs font-mono space-y-1">
              {latestLogs.map((log, i) => (
                <div key={i} className="text-gray-300 truncate">
                  {log}
                </div>
              ))}
            </div>
            {scan.logs.length > 5 && (
              <div className="text-xs text-gray-500 mt-1">
                ... {scan.logs.length - 5} more log entries
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gray-800 border-b border-gray-700 shadow-lg">
      <div className="max-w-7xl mx-auto">
        {/* Summary Bar */}
        <div className="flex items-center gap-4 px-4 py-2 bg-gradient-to-r from-blue-900/50 to-purple-900/50">
          <Activity className="w-5 h-5 text-blue-400" />
          <div className="flex-1 flex items-center gap-6 text-sm">
            {runningScans.length > 0 && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-blue-400 font-medium">
                  {runningScans.length} Running
                </span>
              </div>
            )}
            {completedScans.length > 0 && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-medium">
                  {completedScans.length} Complete
                </span>
              </div>
            )}
            {errorScans.length > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 font-medium">
                  {errorScans.length} Failed
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              completedScans.forEach(s => clearScan(s.scanId));
              errorScans.forEach(s => clearScan(s.scanId));
            }}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 hover:bg-gray-700 rounded"
          >
            Clear All Finished
          </button>
        </div>

        {/* Scan List */}
        <div className="max-h-96 overflow-y-auto">
          {runningScans.map(renderScan)}
          {completedScans.map(renderScan)}
          {errorScans.map(renderScan)}
        </div>
      </div>
    </div>
  );
};
