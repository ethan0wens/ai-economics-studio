import { declaredCopilotCredits, type Environment, type StudioObject } from './domain';
import type { FieldId } from './field-help';
import type { Line } from './ledger';

export function missingInputs(item: StudioObject, env: Environment): FieldId[] {
  const missing: FieldId[] = [];
  const needs = (field: FieldId, value: unknown) => {
    if (value === undefined || value === null || value === '') missing.push(field);
  };
  switch (item.kind) {
    case 'agent': {
      needs('platform', item.platform);
      needs('modelSource', item.modelSource);
      if (item.modelSource === 'platform-managed' && item.platform === 'copilot-studio') {
        needs(item.creditMethod === 'breakdown' ? 'creditCategory' : 'credits', declaredCopilotCredits(item)[0]);
      }
      if (item.modelSource === 'deployment-ref' && item.platform === 'foundry-agent-service') {
        const deployment = env.relationships.find(edge => edge.type === 'agent-uses-deployment' && edge.from === item.id);
        needs('linkedDeployment', deployment);
        const model = env.objects.find(object => object.id === deployment?.to);
        if (model?.kind === 'model-deployment' && (model.mode === 'payg' || model.allocationBasis)) {
          needs('usageLink', env.relationships.find(edge => edge.type === 'agent-uses-usage' && edge.from === item.id));
        }
      }
      break;
    }
    case 'model-deployment':
      needs('modelId', item.modelId);
      needs('billingMode', item.mode);
      if (item.mode === 'provisioned') {
        needs('capacity', item.capacity);
        needs('hours', item.billableHours);
      }
      break;
    case 'user-group':
      needs('intended', item.intended);
      needs('active', item.active);
      break;
    case 'licence-entitlement':
      needs('procurement', item.procurement === 'unknown' ? undefined : item.procurement);
      if (item.procurement === 'incremental') needs('seats', item.seats);
      break;
    case 'supporting-resource':
      needs('resourceQuantity', item.monthlyQuantity);
      break;
    case 'security-policy':
      needs('control', item.control);
      needs('controlStatus', item.status);
      break;
    case 'usage-profile':
      needs('executions', item.executions);
      needs('calls', item.calls);
      needs('input', item.input);
      needs('output', item.output);
      break;
  }
  return missing;
}

export function hasUnknownPrice(lines: Line[]) {
  return lines.some(line => line.meter && line.quantity !== null && line.amounts.current === null);
}
