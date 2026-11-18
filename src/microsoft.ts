import type { StudioObject } from './domain';

export const microsoft = {
  foundry: 'https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/connected-models',
  copilot: 'https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-licensing-subscriptions',
  byom: 'https://learn.microsoft.com/en-us/microsoft-copilot-studio/bring-your-own-model-prompts',
  governance: 'https://learn.microsoft.com/en-us/security/zero-trust/',
  dlp: 'https://learn.microsoft.com/en-us/microsoft-copilot-studio/admin-data-loss-prevention',
  budget: 'https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets',
};
type Agent = Extract<StudioObject, {kind: 'agent'}>;
type Model = Extract<StudioObject, {kind: 'model-deployment'}>;
export function compatibility(agent: Agent, model?: Model) {
  if (!agent.platform || !agent.modelSource) return { status: 'draft', reason: 'Choose an agent platform and model source.' } as const;
  if (agent.platform === 'copilot-studio') {
    if (agent.modelSource === 'deployment-ref') return {
      status: 'verified-unsupported', source: microsoft.byom,
      reason: 'Prompt-specific BYOM does not establish a primary-model replacement. This path has no separate inference charge.',
    } as const;
    return {
      status: 'verified-supported', source: microsoft.copilot,
      reason: 'Model via the platform. Enter your credit assumptions and plan-specific price; no Foundry inference is added.',
    } as const;
  }
  if (agent.modelSource === 'deployment-ref' && !model) return { status: 'draft', reason: 'Link a model deployment.' } as const;
  if (agent.modelSource === 'deployment-ref' && (!model?.modelId || !model.mode)) return { status: 'draft', reason: 'Specify the linked model and deployment billing mode.' } as const;
  return {
    status: 'unverified', source: microsoft.foundry,
    reason: 'The exact model, region and feature combination requires validation. Declared usage and manual prices are planning assumptions.',
  } as const;
}
