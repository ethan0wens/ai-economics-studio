import Decimal from 'decimal.js';
import { z } from 'zod';

const nonnegative = z.number().min(0).max(1e15);
const percentage = z.number().min(0).max(100);
const assumption = (value: z.ZodNumber) => z.strictObject({
  value, source: z.enum(['entered', 'imported', 'fictional']), note: z.string().trim().max(300).optional(),
}).optional();

export const valuePlanSchema = z.strictObject({
  currency: z.string().regex(/^[A-Z]{3}$/),
  assumptions: z.strictObject({
    audience: assumption(nonnegative.int()), adoption: assumption(percentage), tasks: assumption(nonnegative),
    minutes: assumption(nonnegative), realisation: assumption(percentage), hourlyValue: assumption(nonnegative),
    cashableSavings: assumption(nonnegative), implementation: assumption(nonnegative), ongoing: assumption(nonnegative),
  }).refine(values => Object.values(values).some(value => value !== undefined), 'Enter at least one value assumption.'),
});

export type ValuePlan = z.infer<typeof valuePlanSchema>;
export type ValueInputs = ValuePlan['assumptions'];
export const valueFields = {
  audience: 'Target users', adoption: 'Expected active adoption (%)', tasks: 'Tasks per active user per month',
  minutes: 'Minutes saved per task', realisation: 'Realisation factor (%)', hourlyValue: 'Assumed value per productive hour',
  cashableSavings: 'Declared monthly cashable savings', implementation: 'One-off implementation costs',
  ongoing: 'Additional monthly operating costs',
} satisfies Record<keyof ValueInputs, string>;
export const valueKeys = Object.keys(valueFields) as (keyof ValueInputs)[];
export const assumptionSources = { entered: 'User-entered assumption', imported: 'Imported customer assumption', fictional: 'Fictional example input' } as const;

const Amount = Decimal.clone({ precision: 80, rounding: Decimal.ROUND_HALF_UP });

export function estimateValue(plan: ValuePlan) {
  const { audience, adoption, tasks, minutes, realisation, hourlyValue, cashableSavings, implementation, ongoing } = plan.assumptions;
  const digits = new Intl.NumberFormat('en-GB', { style: 'currency', currency: plan.currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const active = audience && adoption ? new Amount(audience.value).times(adoption.value).div(100).toDecimalPlaces(0) : null;
  const gross = active && tasks && minutes ? active.times(tasks.value).times(minutes.value).div(60) : null;
  const realised = gross && realisation ? gross.times(realisation.value).div(100) : null;
  const equivalent = realised && hourlyValue ? realised.times(hourlyValue.value) : null;
  const pair = (value: Decimal | null, decimals: number) => ({ monthly: value?.toFixed(decimals) ?? null, annual: value?.times(12).toFixed(decimals) ?? null });
  return {
    activeUsers: active?.toFixed() ?? null,
    grossHours: pair(gross, 2), realisedHours: pair(realised, 2),
    economicEquivalent: pair(equivalent, digits),
    cashableSavings: pair(cashableSavings ? new Amount(cashableSavings.value) : null, digits),
    implementation: implementation ? new Amount(implementation.value).toFixed(digits) : null,
    additionalOngoing: pair(ongoing ? new Amount(ongoing.value) : null, digits),
  };
}
