// 工具函数
export function generateId(): string {
  return crypto.randomUUID();
}

export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateDeviceId(): string {
  return `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateContentHash(content: ArrayBuffer): Promise<string> {
  return crypto.subtle.digest('SHA-256', content).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  });
}
