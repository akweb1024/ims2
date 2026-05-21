import { logger } from '@/lib/logger';
import { performRazorpaySync } from '@/lib/services/razorpay-sync';

const SCHEDULER_TICK_MS = Number(process.env.RAZORPAY_SYNC_SCHEDULER_TICK_MS || 5 * 60 * 1000);
const INITIAL_DELAY_MS = Number(process.env.RAZORPAY_SYNC_INITIAL_DELAY_MS || 60 * 1000);

declare global {
    var __razorpaySyncSchedulerStarted: boolean | undefined;
    var __razorpaySyncSchedulerCleanup: (() => void) | undefined;
}

export function startRazorpaySyncScheduler() {
    if (globalThis.__razorpaySyncSchedulerStarted) {
        return;
    }

    if (process.env.NODE_ENV !== 'production') {
        logger.info('Skipping Razorpay scheduler outside production');
        return;
    }

    if (process.env.RAZORPAY_SYNC_SCHEDULER === 'false') {
        logger.info('Razorpay scheduler disabled by env');
        return;
    }

    globalThis.__razorpaySyncSchedulerStarted = true;

    let intervalId: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const tick = async () => {
        try {
            const result = await performRazorpaySync({ trigger: 'scheduler' });
            if (result.skipped) {
                logger.debug('Razorpay scheduler tick skipped', { message: result.message });
            }
        } catch (error) {
            logger.error('Razorpay scheduler tick failed', error);
        }
    };

    timeoutId = setTimeout(() => {
        void tick();
        intervalId = setInterval(() => {
            void tick();
        }, SCHEDULER_TICK_MS);
    }, INITIAL_DELAY_MS);

    // Cleanup function for graceful shutdown
    const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (intervalId) clearInterval(intervalId);
        globalThis.__razorpaySyncSchedulerStarted = false;
        logger.info('Razorpay scheduler stopped');
    };

    globalThis.__razorpaySyncSchedulerCleanup = cleanup;

    // Register cleanup on process termination
    if (typeof process !== 'undefined') {
        process.on('SIGTERM', cleanup);
        process.on('SIGINT', cleanup);
    }

    logger.info('Razorpay scheduler started', {
        tickMs: SCHEDULER_TICK_MS,
        initialDelayMs: INITIAL_DELAY_MS,
    });
}
