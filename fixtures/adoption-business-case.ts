// Independent fictional test expectations. These rates belong only to regression tests.
export const businessCase = {
  id: 'ai-adoption-business-case',
  rateSpecs: [
    ['gpt-4-1-mini-global-uksouth', 'input', '0.20'],
    ['gpt-4-1-mini-global-uksouth', 'output', '0.50'],
  ],
  cases: [
    { adoption: 25, active: '50', executions: '500', input: '750000', output: '150000',
      gross: '200.00', realised: '120.00', monthlySpend: '225.00', annualSpend: '2700.00', monthlyValue: '3000.00', annualValue: '36000.00' },
    { adoption: 50, active: '100', executions: '1000', input: '1500000', output: '300000',
      gross: '400.00', realised: '240.00', monthlySpend: '450.00', annualSpend: '5400.00', monthlyValue: '6000.00', annualValue: '72000.00' },
    { adoption: 75, active: '150', executions: '1500', input: '2250000', output: '450000',
      gross: '600.00', realised: '360.00', monthlySpend: '675.00', annualSpend: '8100.00', monthlyValue: '9000.00', annualValue: '108000.00' },
  ],
} as const;
