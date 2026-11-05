import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  NetSummary,
  BreakdownItem,
  TimeseriesPoint,
  LedgerVerification,
  RunComparison,
  Recommendation,
  DeviceNode,
  SamputaBatch,
  VernacularRecord,
  LiveWebSocketMessage
} from '../lib/types';
import {
  getNetSummary,
  getBreakdown,
  getTimeseries,
  getRunsCompare,
  getRecommendations,
  verifyLedger,
  getDevices,
  getSamputaStatus,
  getVernacularHistory
} from '../lib/api';

export function useLive() {
  const [net, setNet] = useState<NetSummary | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([]);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [runs, setRuns] = useState<RunComparison | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [ledger, setLedger] = useState<LedgerVerification | null>(null);
  const [devices, setDevices] = useState<DeviceNode[]>([]);
  const [samputa, setSamputa] = useState<SamputaBatch | null>(null);
  const [vernacular, setVernacular] = useState<VernacularRecord[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backoffRef = useRef(1000);
  const isMountedRef = useRef(true);

  // Initial and periodic REST state fetch
  const fetchAllData = useCallback(async () => {
    try {
      const [
        netRes,
        breakdownRes,
        timeseriesRes,
        runsRes,
        recsRes,
        ledgerRes,
        devicesRes,
        samputaRes,
        vernacularRes
      ] = await Promise.allSettled([
        getNetSummary(),
        getBreakdown(),
        getTimeseries(),
        getRunsCompare(),
        getRecommendations(),
        verifyLedger(),
        getDevices(),
        getSamputaStatus(),
        getVernacularHistory()
      ]);

      if (!isMountedRef.current) return;

      if (netRes.status === 'fulfilled') setNet(netRes.value);
      if (breakdownRes.status === 'fulfilled') setBreakdown(breakdownRes.value);
      if (timeseriesRes.status === 'fulfilled') setTimeseries(timeseriesRes.value);
      if (runsRes.status === 'fulfilled') setRuns(runsRes.value);
      if (recsRes.status === 'fulfilled') setRecommendations(recsRes.value);
      if (ledgerRes.status === 'fulfilled') setLedger(ledgerRes.value);
      if (devicesRes.status === 'fulfilled') setDevices(devicesRes.value);
      if (samputaRes.status === 'fulfilled') setSamputa(samputaRes.value);
      if (vernacularRes.status === 'fulfilled') setVernacular(vernacularRes.value);

      setError(null);
      setLastUpdateTime(new Date().toISOString());
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to reach hub API');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // WebSocket Connection with bounded exponential backoff
  const connectWebSocket = useCallback(() => {
    if (!isMountedRef.current) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = (import.meta.env.VITE_API_BASE_URL || window.location.origin)
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
    const wsUrl = `${protocol}//${host}/ws/live`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        setIsConnected(true);
        setError(null);
        backoffRef.current = 1000; // Reset backoff on success
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const msg: LiveWebSocketMessage = JSON.parse(event.data);
          setLastUpdateTime(new Date().toISOString());

          if (msg.type === 'telemetry') {
            setNet((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                power_w: msg.data.power_w !== undefined ? msg.data.power_w : prev.power_w,
                bad_kg: msg.data.bad_kg !== undefined ? msg.data.bad_kg : prev.bad_kg,
                good_kg: msg.data.good_kg !== undefined ? msg.data.good_kg : prev.good_kg,
                net_kg: msg.data.net_kg !== undefined ? msg.data.net_kg : prev.net_kg,
                kwh_today: msg.data.kwh_today !== undefined ? msg.data.kwh_today : prev.kwh_today,
                updated: new Date().toISOString()
              };
            });
          } else if (msg.type === 'relay') {
            fetchAllData();
          } else if (msg.type === 'ledger') {
            verifyLedger().then((res) => setLedger(res)).catch(() => {});
          } else if (msg.type === 'batch') {
            getSamputaStatus().then((res) => setSamputa(res)).catch(() => {});
          }
        } catch (e) {
          console.warn('Failed to parse WebSocket message', e);
        }
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        setIsConnected(false);
        // Exponential backoff reconnect: 1s -> 2s -> 4s -> max 10s
        const nextDelay = Math.min(backoffRef.current * 1.5, 10000);
        backoffRef.current = nextDelay;
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, nextDelay);
      };

      ws.onerror = () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    } catch {
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
    }
  }, [fetchAllData]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchAllData();
    connectWebSocket();

    // Fallback polling every 5s if WebSocket is disconnected
    const pollingInterval = setInterval(() => {
      if (!isConnected) {
        fetchAllData();
      }
    }, 5000);

    return () => {
      isMountedRef.current = false;
      clearInterval(pollingInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchAllData, connectWebSocket, isConnected]);

  return {
    net,
    breakdown,
    timeseries,
    runs,
    recommendations,
    ledger,
    devices,
    samputa,
    vernacular,
    isLoading,
    isConnected,
    error,
    lastUpdateTime,
    refresh: fetchAllData,
    setLedger,
    setSamputa
  };
}

