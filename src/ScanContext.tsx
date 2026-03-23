import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface Scan {
  scanId: string;
  type: 'cicd' | 'sre' | 'devprod';
  status: 'running' | 'complete' | 'error';
  logs: string[];
  data: any;
  message?: string;
  startTime: number;
  platforms: string;
  orgId: string;
  totalRepos?: number;
  scannedRepos?: number;
}

interface ScanContextType {
  activeScans: Map<string, Scan>;
  startScan: (type: 'cicd' | 'sre' | 'devprod', platforms: string, orgId: string) => Promise<string>;
  getScanStatus: (scanId: string) => Scan | undefined;
  clearScan: (scanId: string) => void;
  getActiveScanCount: () => number;
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export const ScanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeScans, setActiveScans] = useState<Map<string, Scan>>(new Map());
  const [pollingIntervals, setPollingIntervals] = useState<Map<string, NodeJS.Timeout>>(new Map());

  const startScan = useCallback(async (type: 'cicd' | 'sre' | 'devprod', platforms: string, orgId: string): Promise<string> => {
    const scanId = Date.now().toString();
    const endpointMap: Record<string, string> = {
      cicd: '/api/agents/cicd/scan/start',
      sre: '/api/sre/scan/start',
      devprod: '/api/agents/devprod/scan/start'
    };
    const endpoint = endpointMap[type];

    // Initialize scan
    const newScan: Scan = {
      scanId,
      type,
      status: 'running',
      logs: [`[SYSTEM] Initializing ${type === 'cicd' ? 'CI/CD Discovery' : type === 'devprod' ? 'Developer Productivity' : 'SRE'} Agent...`],
      data: null,
      startTime: Date.now(),
      platforms,
      orgId
    };

    setActiveScans(prev => new Map(prev).set(scanId, newScan));

    try {
      // Start the scan
      const response = await fetch(`${endpoint}?orgId=${orgId}&platforms=${encodeURIComponent(platforms)}&scanId=${scanId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to start scan');
      }

      // Start polling
      const statusEndpointMap: Record<string, string> = {
        cicd: '/api/agents/cicd/scan/status',
        sre: '/api/sre/scan/status',
        devprod: '/api/agents/devprod/scan/status'
      };
      const statusEndpoint = statusEndpointMap[type];
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`${statusEndpoint}?orgId=${orgId}&scanId=${scanId}`);
          const status = await statusRes.json();

          setActiveScans(prev => {
            const updated = new Map(prev);
            const scan = updated.get(scanId);
            if (scan) {
              updated.set(scanId, {
                ...scan,
                status: status.status,
                logs: status.logs || scan.logs,
                data: status.data || scan.data,
                message: status.message,
                totalRepos: status.totalRepos ?? scan.totalRepos,
                scannedRepos: status.scannedRepos ?? scan.scannedRepos
              });
            }
            return updated;
          });

          // Stop polling if scan is complete or errored
          if (status.status === 'complete' || status.status === 'error') {
            clearInterval(pollInterval);
            setPollingIntervals(prev => {
              const updated = new Map(prev);
              updated.delete(scanId);
              return updated;
            });

            // Show notification
            if (status.status === 'complete') {
              if (Notification.permission === 'granted') {
                new Notification(`${type === 'cicd' ? 'CI/CD' : type === 'devprod' ? 'Developer Productivity' : 'SRE'} Scan Complete`, {
                  body: `Scan finished successfully`,
                  icon: '/favicon.ico'
                });
              }
            }
          }
        } catch (e) {
          console.error('Poll error:', e);
        }
      }, 1000);

      setPollingIntervals(prev => new Map(prev).set(scanId, pollInterval));

      // Timeout after 10 minutes
      setTimeout(() => {
        const interval = pollingIntervals.get(scanId);
        if (interval) {
          clearInterval(interval);
          setPollingIntervals(prev => {
            const updated = new Map(prev);
            updated.delete(scanId);
            return updated;
          });
        }

        setActiveScans(prev => {
          const updated = new Map(prev);
          const scan = updated.get(scanId);
          if (scan && scan.status === 'running') {
            updated.set(scanId, {
              ...scan,
              status: 'error',
              message: 'Scan timeout',
              logs: [...scan.logs, '[ERROR] Scan timeout after 10 minutes']
            });
          }
          return updated;
        });
      }, 600000);

    } catch (error: any) {
      setActiveScans(prev => {
        const updated = new Map(prev);
        updated.set(scanId, {
          ...newScan,
          status: 'error',
          message: error.message,
          logs: [...newScan.logs, `[ERROR] ${error.message}`]
        });
        return updated;
      });
    }

    return scanId;
  }, [pollingIntervals]);

  const getScanStatus = useCallback((scanId: string): Scan | undefined => {
    return activeScans.get(scanId);
  }, [activeScans]);

  const clearScan = useCallback((scanId: string) => {
    const interval = pollingIntervals.get(scanId);
    if (interval) {
      clearInterval(interval);
    }

    setPollingIntervals(prev => {
      const updated = new Map(prev);
      updated.delete(scanId);
      return updated;
    });

    setActiveScans(prev => {
      const updated = new Map(prev);
      updated.delete(scanId);
      return updated;
    });
  }, [pollingIntervals]);

  const getActiveScanCount = useCallback(() => {
    return Array.from(activeScans.values()).filter(s => s.status === 'running').length;
  }, [activeScans]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      pollingIntervals.forEach(interval => clearInterval(interval));
    };
  }, [pollingIntervals]);

  return (
    <ScanContext.Provider value={{ activeScans, startScan, getScanStatus, clearScan, getActiveScanCount }}>
      {children}
    </ScanContext.Provider>
  );
};

export const useScanContext = () => {
  const context = useContext(ScanContext);
  if (!context) {
    throw new Error('useScanContext must be used within a ScanProvider');
  }
  return context;
};
