import { useState, useCallback } from 'react';
import { useApparatus } from '../providers/ApparatusProvider';

export function useForensics() {
  const { baseUrl } = useApparatus();
  const [isCapturing, setIsCapturing] = useState(false);
  const [replayResult, setReplayResult] = useState<any | null>(null);

  const startCapture = useCallback((iface = 'eth0', duration = 10) => {
    if (!baseUrl) return;
    setIsCapturing(true);
    // PCAP endpoint streams the file, so we just construct the URL for download
    const url = `${baseUrl}/capture.pcap?iface=${iface}&duration=${duration}`;
    
    // Auto-download trick
    const link = document.createElement('a');
    link.href = url;
    link.download = `capture-${Date.now()}.pcap`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Reset state after duration
    setTimeout(() => setIsCapturing(false), duration * 1000);
  }, [baseUrl]);

  const replayHar = useCallback(async (file: File) => {
    if (!baseUrl) return;
    setIsCapturing(true); // Reuse loading state
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const harJson = JSON.parse(e.target?.result as string);
            const res = await fetch(`${baseUrl}/replay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(harJson)
            });
            const result = await res.json();
            setReplayResult(result);
        } catch (err) {
            console.error(err);
            setReplayResult({ error: 'Failed to parse or replay HAR' });
        } finally {
            setIsCapturing(false);
        }
    };
    reader.readAsText(file);
  }, [baseUrl]);

  return {
    startCapture,
    replayHar,
    isCapturing,
    replayResult
  };
}
