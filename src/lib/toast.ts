import toast from 'react-hot-toast';

/**
 * Custom toast notification utilities
 * Provides consistent toast notifications across the application
 */

interface ToastOptions {
    duration?: number;
    position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

const defaultOptions: ToastOptions = {
    duration: 4000,
    position: 'top-right',
};

/**
 * Show a success toast notification
 */
export const showSuccess = (message: string, options?: ToastOptions) => {
    return toast.success(message, {
        duration: options?.duration || defaultOptions.duration,
        position: options?.position || defaultOptions.position,
        style: {
            background: '#10b981',
            color: '#fff',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
        },
        iconTheme: {
            primary: '#fff',
            secondary: '#10b981',
        },
    });
};

/**
 * Show an error toast notification
 */
export const showError = (message: string, options?: ToastOptions) => {
    return toast.error(message, {
        duration: options?.duration || defaultOptions.duration,
        position: options?.position || defaultOptions.position,
        style: {
            background: '#ef4444',
            color: '#fff',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
        },
        iconTheme: {
            primary: '#fff',
            secondary: '#ef4444',
        },
    });
};

/**
 * Show a warning toast notification
 */
export const showWarning = (message: string, options?: ToastOptions) => {
    return toast(message, {
        duration: options?.duration || defaultOptions.duration,
        position: options?.position || defaultOptions.position,
        icon: '⚠️',
        style: {
            background: '#f59e0b',
            color: '#fff',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
        },
    });
};

/**
 * Show an info toast notification
 */
export const showInfo = (message: string, options?: ToastOptions) => {
    return toast(message, {
        duration: options?.duration || defaultOptions.duration,
        position: options?.position || defaultOptions.position,
        icon: 'ℹ️',
        style: {
            background: '#3b82f6',
            color: '#fff',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
        },
    });
};

/**
 * Show a loading toast notification
 * Returns a toast ID that can be used to dismiss or update the toast
 */
export const showLoading = (message: string, options?: ToastOptions) => {
    return toast.loading(message, {
        position: options?.position || defaultOptions.position,
        style: {
            background: '#6366f1',
            color: '#fff',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
        },
    });
};

/**
 * Dismiss a specific toast by ID
 */
export const dismissToast = (toastId: string) => {
    toast.dismiss(toastId);
};

/**
 * Dismiss all toasts
 */
export const dismissAllToasts = () => {
    toast.dismiss();
};

/**
 * Show a promise-based toast
 * Automatically shows loading, success, or error based on promise state
 */
export const showPromise = <T,>(
    promise: Promise<T>,
    messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: any) => string);
    },
    options?: ToastOptions
) => {
    return toast.promise(
        promise,
        {
            loading: messages.loading,
            success: messages.success,
            error: messages.error,
        },
        {
            position: options?.position || defaultOptions.position,
            style: {
                padding: '16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '500',
            },
        }
    );
};

// Export the base toast for custom use cases
export { toast };
