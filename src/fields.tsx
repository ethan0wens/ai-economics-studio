import { type ReactNode } from 'react';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

export function Text({ label, value, onChange, placeholder }: { label: string; value?: string; onChange: (value: string) => void; placeholder?: string }) {
  return <Field label={label}><input value={value ?? ''} onChange={event => onChange(event.target.value)}
    maxLength={300} placeholder={placeholder} /></Field>;
}

export function NumberField({ label, value, onChange, min = 0, max = 1e15, step = 'any' }: {
  label: string; value?: number; onChange: (value?: number) => void; min?: number; max?: number; step?: 'any' | number;
}) {
  return <Field label={label}><input type="number" min={min} max={max} step={step} defaultValue={value}
    onChange={event => {
      const input = event.currentTarget;
      if (input.validity.valid) onChange(input.value === '' ? undefined : input.valueAsNumber);
    }} /></Field>;
}

export function Select({ label, value, options, onChange, empty = 'Select…' }: {
  label: string; value?: string; options: (string | [string, string])[]; onChange: (value: string) => void; empty?: string | false;
}) {
  return <Field label={label}><select value={value ?? ''} onChange={event => onChange(event.target.value)}>
    {empty !== false && <option value="">{empty}</option>}
    {options.map(item => {
      const [key, label] = typeof item === 'string' ? [item, item] : item;
      return <option key={key} value={key}>{label}</option>;
    })}
  </select></Field>;
}
