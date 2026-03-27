import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface BaseInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
}

type InputFieldProps = BaseInputProps &
  InputHTMLAttributes<HTMLInputElement> & {
    variant?: 'text' | 'email' | 'url' | 'password';
  };

type TextareaFieldProps = BaseInputProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    variant: 'textarea';
  };

export type InputProps = InputFieldProps | TextareaFieldProps;

const baseInputStyles = `
  block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900
  placeholder:text-gray-400
  focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500
  disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500
  dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500
  dark:focus:border-indigo-400 dark:focus:ring-indigo-400
  dark:disabled:bg-gray-900 dark:disabled:text-gray-600
`;

const errorInputStyles = `
  border-red-500 focus:border-red-500 focus:ring-red-500
  dark:border-red-400 dark:focus:border-red-400 dark:focus:ring-red-400
`;

export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  (props, ref) => {
    const { label, error, helperText, className = '', variant = 'text', ...rest } = props;
    const inputClassName = `${baseInputStyles} ${error ? errorInputStyles : ''} ${className}`;

    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}

        {variant === 'textarea' ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            className={`${inputClassName} min-h-[80px] resize-y`}
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            type={variant}
            className={inputClassName}
            {...(rest as InputHTMLAttributes<HTMLInputElement>)}
          />
        )}

        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {!error && helperText && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
