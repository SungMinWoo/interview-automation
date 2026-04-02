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
  block w-full border border-line bg-surface-secondary px-3 py-2 text-sm text-content-primary
  placeholder:text-content-tertiary
  focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent
  disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-content-tertiary
`;

const errorInputStyles = `
  border-danger focus:border-danger focus:ring-danger
`;

export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  (props, ref) => {
    const { label, error, helperText, className = '', variant = 'text', ...rest } = props;
    const inputClassName = `${baseInputStyles} ${error ? errorInputStyles : ''} ${className}`;

    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-content-secondary">
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
          <p className="mt-1 text-sm text-danger">{error}</p>
        )}
        {!error && helperText && (
          <p className="mt-1 text-sm text-content-tertiary">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
