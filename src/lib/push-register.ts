export async function registerPush() {
    if (!('serviceWorker' in navigator)) return;

    // Check if permission is already denied
    if (Notification.permission === 'denied') {
        console.warn('Push notifications are blocked by the user.');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js');

        const subscription = await registration.pushManager.getSubscription();
        if (subscription) return subscription;

        const response = await fetch('/api/notifications/vapid-public-key');
        const { publicKey } = await response.json();

        if (!publicKey) {
            console.error('VAPID public key not found');
            return;
        }

        const newSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        await fetch('/api/notifications/push-subscription', {
            method: 'POST',
            body: JSON.stringify(newSubscription),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        return newSubscription;
    } catch (error) {
        // The browser throws an AbortError ("Registration failed - push service
        // not available") when it can't reach a push backend — e.g. Linux
        // Chromium builds without Google API keys, Brave with push disabled, or
        // a network blocking FCM. This is an environment limitation, not an app
        // error, so degrade quietly instead of surfacing a console error overlay.
        const isPushUnavailable =
            error instanceof DOMException &&
            (error.name === 'AbortError' || error.name === 'NotSupportedError');

        if (isPushUnavailable) {
            console.warn('Push notifications unavailable in this browser/environment; skipping registration.');
            return;
        }

        console.error('Push registration failed:', error);
    }
}

function urlBase64ToUint8Array(base64String: string) {
    if (!base64String) return new Uint8Array(0);
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
