// 工具函数
export function generateId() {
    return crypto.randomUUID();
}
export function generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
export function generateDeviceId() {
    return `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
export function calculateContentHash(content) {
    return crypto.subtle.digest('SHA-256', content).then(hashBuffer => {
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    });
}
