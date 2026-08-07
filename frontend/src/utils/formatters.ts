export const formatTimeOnly = (scannedAt: any): string => {
  if (!scannedAt) return '-';
  if (typeof scannedAt === 'string') {
    // If HH:mm or HH:mm:ss format directly
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(scannedAt)) {
      return scannedAt;
    }
    // Extract ISO time string T17:55:49
    const match = scannedAt.match(/T(\d{2}:\d{2}:\d{2})/);
    if (match) {
      return match[1];
    }
    const spaceMatch = scannedAt.match(/\s(\d{2}:\d{2}:\d{2})/);
    if (spaceMatch) {
      return spaceMatch[1];
    }
  }
  try {
    const d = new Date(scannedAt);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch {
    return String(scannedAt);
  }
};
