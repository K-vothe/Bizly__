import React, { useRef, useEffect, useState } from 'react';

export interface OtpInputProps {
  value?: string;
  onChange: (otp: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: boolean;
}

export default function OtpInput({
  value = '',
  onChange,
  disabled = false,
  autoFocus = true,
  error = false,
}: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(() => {
    const initial = value ? value.split('').slice(0, 6) : [];
    while (initial.length < 6) initial.push('');
    return initial;
  });

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sincronizar si el valor externo cambia (ej. reset o autofill)
  useEffect(() => {
    const nextDigits = value ? value.split('').slice(0, 6) : [];
    while (nextDigits.length < 6) nextDigits.push('');
    setDigits(nextDigits);
  }, [value]);

  // Autofoco al montar en el primer input vacío
  useEffect(() => {
    if (autoFocus && !disabled) {
      const firstEmptyIndex = digits.findIndex((d) => !d);
      const targetIndex = firstEmptyIndex === -1 ? 0 : firstEmptyIndex;
      inputRefs.current[targetIndex]?.focus();
    }
  }, []);

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        // Borrar valor actual
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
        onChange(newDigits.join(''));
      } else if (index > 0) {
        // Retroceder al input anterior y borrarlo
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        onChange(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
      return;
    }

    // Prevenir cualquier carácter que no sea numérico 0-9
    if (
      !/^[0-9]$/.test(e.key) &&
      !['Tab', 'Delete', 'ArrowUp', 'ArrowDown'].includes(e.key) &&
      !e.ctrlKey &&
      !e.metaKey
    ) {
      e.preventDefault();
    }
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const val = e.target.value;
    const lastChar = val.slice(-1);

    if (/^\d$/.test(lastChar)) {
      const newDigits = [...digits];
      newDigits[index] = lastChar;
      setDigits(newDigits);
      onChange(newDigits.join(''));

      // Avanzar automáticamente al siguiente input
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (val === '') {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      onChange(newDigits.join(''));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();

    // Validar con Regex estricto que sean exactamente 6 números
    if (/^\d{6}$/.test(pastedData)) {
      const newDigits = pastedData.split('');
      setDigits(newDigits);
      onChange(pastedData);
      inputRefs.current[5]?.focus();
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 my-4">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onChange={(e) => handleChange(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl border transition-all shadow-sm outline-none ${
            disabled ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : ''
          } ${
            error
              ? 'border-red-400 bg-red-50/40 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-200'
              : 'border-slate-300 bg-slate-50 text-slate-900 focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-500/20'
          }`}
          aria-label={`Dígito ${index + 1} de verificación`}
        />
      ))}
    </div>
  );
}
