export function shortId(value: string) {
  return value.slice(0, 8);
}

export function formatCoords(lat: number | null, lng: number | null) {
  if (lat === null || lng === null) {
    return '—';
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export function formatTime(value: string | null) {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function randomMerchantId() {
  return `M-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function nextClientOrderId() {
  return `ORD-${Date.now().toString().slice(-8)}`;
}

export function karachiPickup() {
  return {
    latitude: Number((24.8607 + (Math.random() - 0.5) * 0.03).toFixed(5)),
    longitude: Number((67.0011 + (Math.random() - 0.5) * 0.03).toFixed(5)),
  };
}
