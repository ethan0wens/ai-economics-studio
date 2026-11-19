import { cloneElement, useEffect, useId, useRef, useState, type ReactElement } from 'react';
import { Info } from 'lucide-react';
import { helpTopics } from './help-links';
import { routeHref } from './navigation';
import { fieldHelp, type FieldId, type Requirement } from './field-help';

export function FieldHelp({ field, label, requirement }: {field: FieldId; label: string; requirement: Requirement}) {
  const { units, guidance, source } = fieldHelp[field];
  const topic = (helpTopics as Partial<Record<FieldId, readonly [string, string]>>)[field];
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<'closed' | 'preview' | 'pinned'>('closed');
  const open = state !== 'closed';

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setState('closed');
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  return <div ref={container} className="field-help" data-help={field}
    onPointerEnter={event => {
      if (event.pointerType === 'mouse') setState(current => current === 'closed' ? 'preview' : current);
    }}
    onPointerLeave={event => {
      if (event.pointerType === 'mouse' && !container.current?.contains(document.activeElement)) {
        setState(current => current === 'preview' ? 'closed' : current);
      }
    }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setState('closed'); }}
    onKeyDown={event => {
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        event.stopPropagation();
        button.current?.focus();
        setState('closed');
      }
    }}>
    <button ref={button} type="button" className="help-trigger" aria-label={`Help for ${label}`}
      aria-expanded={open} aria-controls={id}
      onFocus={() => setState(current => current === 'closed' ? 'preview' : current)}
      onClick={() => setState(current => current === 'pinned' ? 'closed' : 'pinned')}>
      <Info size={16} aria-hidden="true" />
    </button>
    <div id={id} className="help-card" hidden={!open} role="group" aria-label={`${label} guidance`}>
      <p className="help-meta">{requirement} · {units}</p>
      <p>{guidance}</p>
      {source && <a href={source.href} target="_blank" rel="noreferrer">{source.label}</a>}
      {topic && <a className="field-learn" href={routeHref('documentation', ...topic)}>Learn more in Documentation</a>}
    </div>
  </div>;
}

type FieldProps = {
  field: FieldId; label?: string; requirement?: Requirement; missing?: boolean; hint?: string;
};
export function Field({ field, label = fieldHelp[field].label, requirement = fieldHelp[field].requirement, missing, hint, children }: FieldProps & {
  children: ReactElement<{id?: string; 'aria-describedby'?: string; 'aria-required'?: boolean}>;
}) {
  const id = useId();
  return <div className="field" data-field={field}>
    <div className="field-heading">
      <label htmlFor={id}>{label}</label>
      <FieldHelp field={field} label={label} requirement={requirement} />
      {requirement === 'Optional' && <span className="field-optional">Optional</span>}
      {missing && <span className="field-missing" id={`${id}-missing`}>Information needed</span>}
    </div>
    {cloneElement(children, {
      id,
      'aria-describedby': [missing && `${id}-missing`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined,
      'aria-required': requirement === 'Required' || undefined,
    })}
    {hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
  </div>;
}

export function Text({ value, onChange, placeholder, ...field }: FieldProps & {
  value?: string; onChange: (value: string) => void; placeholder?: string;
}) {
  return <Field {...field}><input value={value ?? ''} onChange={event => onChange(event.target.value)}
    maxLength={300} placeholder={placeholder} /></Field>;
}

export function NumberField({ value, onChange, min = 0, max = 1e15, step = 'any', ...field }: FieldProps & {
  value?: number; onChange: (value?: number) => void; min?: number; max?: number; step?: 'any' | number;
}) {
  return <Field {...field}><input type="number" min={min} max={max} step={step} defaultValue={value}
    onChange={event => {
      const input = event.currentTarget;
      if (input.validity.valid) onChange(input.value === '' ? undefined : input.valueAsNumber);
    }} /></Field>;
}

export function Select({ value, options, onChange, empty = 'Select…', ...field }: FieldProps & {
  value?: string; options: (string | [string, string, boolean?])[]; onChange: (value: string) => void; empty?: string | false;
}) {
  return <Field {...field}><select value={value ?? ''} onChange={event => onChange(event.target.value)}>
    {empty !== false && <option value="">{empty}</option>}
    {options.map(item => {
      const [key, label, disabled] = typeof item === 'string' ? [item, item, false] : item;
      return <option key={key} value={key} disabled={disabled}>{label}</option>;
    })}
  </select></Field>;
}
