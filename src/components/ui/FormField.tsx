import React from 'react';
import { UseFormRegister, FieldError } from 'react-hook-form';

interface FormFieldProps {
    label: string;
    name: string;
    type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'number' | 'date' | 'textarea' | 'select';
    placeholder?: string;
    error?: FieldError;
    required?: boolean;
    register: UseFormRegister<any>;
    options?: { value: string; label: string }[];
    rows?: number;
    className?: string;
    helpText?: string;
    disabled?: boolean;
    defaultValue?: string | number;
}


export default function FormField({
    label,
    name,
    type = 'text',
    placeholder,
    error,
    required = false,
    register,
    options,
    rows = 4,
    className = '',
    helpText,
    disabled = false,
    defaultValue,
}: FormFieldProps) {

    const baseInputClasses = `
        w-full px-4 py-3 rounded-xl border-2 transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:bg-gray-100 disabled:cursor-not-allowed
    `;

    const errorClasses = error
        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500';

    const successClasses = '';

    const inputClasses = `${baseInputClasses} ${errorClasses} ${successClasses} ${className}`;

    const inputId = `field-${name}`;
    const errorId = `error-${name}`;
    const helpId = `help-${name}`;

    return (
        <div className="mb-6">
            {/* Label */}
            <label
                htmlFor={inputId}
                className="block text-sm font-semibold text-gray-700 mb-2"
            >
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {/* Input Field */}
            {type === 'textarea' ? (
                <textarea
                    id={inputId}
                    {...register(name)}
                    placeholder={placeholder}
                    rows={rows}
                    disabled={disabled}
                    defaultValue={defaultValue}
                    className={inputClasses}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? errorId : helpText ? helpId : undefined}
                />
            ) : type === 'select' ? (
                <select
                    id={inputId}
                    {...register(name)}
                    disabled={disabled}
                    className={inputClasses}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? errorId : helpText ? helpId : undefined}
                >
                    <option value="">{placeholder || 'Select an option'}</option>
                    {options?.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            ) : (
                <input
                    id={inputId}
                    type={type}
                    {...register(name)}
                    placeholder={placeholder}
                    disabled={disabled}
                    defaultValue={defaultValue}
                    className={inputClasses}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? errorId : helpText ? helpId : undefined}
                />
            )}

            {/* Help Text */}
            {helpText && !error && (
                <p id={helpId} className="mt-2 text-sm text-gray-500">
                    {helpText}
                </p>
            )}

            {/* Error Message */}
            {error && (
                <div
                    id={errorId}
                    className="mt-2 flex items-start gap-2 text-sm text-red-600"
                    role="alert"
                >
                    <span className="flex-shrink-0 mt-0.5">⚠️</span>
                    <span>{error.message}</span>
                </div>
            )}

            {/* Success Indicator */}
        </div>
    );
}
