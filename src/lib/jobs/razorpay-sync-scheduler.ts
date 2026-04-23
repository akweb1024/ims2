import { logger } from '@/lib/logger';
import { performRazorpaySync } from '@/lib/services/razorpay-sync';

const SCHEDULER_TICK_MS = Number(process.env.RAZORPAY_SYNC_SCHEDULER_TICK_MS || 5 * 60 * 1000);
const INITIAL_DELAY_MS = Number(process.env.RAZORPAY_SYNC_INITIAL_DELAY_MS || 60 * 1000);

declare global {
    // eslint-disable-next-line no-var
    var __razorpaySyncSchedulerStarted: boolean | undefined;
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

    setTimeout(() => {
        void tick();
        setInterval(() => {
            void tick();
        }, SCHEDULER_TICK_MS);
    }, INITIAL_DELAY_MS);

    logger.info('Razorpay scheduler started', {
        tickMs: SCHEDULER_TICK_MS,
        initialDelayMs: INITIAL_DELAY_MS,
    });
}
