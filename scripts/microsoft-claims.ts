import { elements, main, normalize, words } from './microsoft-source';

const fragments = new Set(['p', 'li', 'td', 'dd']);
const canonical = (value: string) => normalize(value).toLowerCase();
export function claimsOnPage(html: string) {
  const lines = elements(main(html), fragments).map(words).map(canonical);
  return new Set(lines.filter(line => line.length > 12 && line.length < 1600));
}

// Keep individually reviewed text selectors. Every term in a row must occur in
// the same source block. Multiple rows are separately required observations.
const selectors: Record<string, string[][]> = {
  'copilot-enterprise-base': [['microsoft 365 copilot', 'qualifying'], ['microsoft 365 e3', 'office 365 e3']],
  'copilot-business-base': [['copilot business', 'microsoft 365 business']],
  'copilot-bundles': [['copilot', 'microsoft 365 business standard'], ['copilot', 'microsoft 365 business premium']],
  'copilot-included-use': [['microsoft 365 copilot', 'authenticated'], ['computer-using agents', 'credits']],
  'agent365-e7': [['microsoft 365 e7', 'includes', 'agent 365']],
  'agent365-user': [['agent 365', 'users', 'sponsor']],
  'entra-e3': [['entra id p1', 'microsoft 365 e3']],
  'entra-e5': [['entra id p2', 'microsoft 365 e5']],
  'entra-suite-base': [['entra suite', 'requires', 'entra id p1']],
  'entra-p2-base': [['entra id p2', 'includes', 'entra id p1']],
  'entra-suite-e7': [['entra suite', 'included', 'microsoft 365 e7']],
  'entra-governance': [['entra id governance', 'prerequisite']],
  'defender-xdr': [['defender', 'prerequisites'], ['defender for identity', 'defender for cloud apps']],
  'agent365-base': [['agent 365', 'microsoft 365 subscription', 'required']],
  'defender-office-plan2': [['defender for office 365 plan 2', 'offers everything in plan 1']],
  'defender-suite-overlap': [['defender suite', 'endpoint', 'email', 'identity', 'saas']],
  'purview-ediscovery': [['ediscovery', 'premium', 'license'], ['ediscovery manager', 'role']],
  'search-classic-private-basic': [['basic agent deployments does not support private foundry iq resources']],
  'search-classic-private-standard': [['deploy the standard agent with virtual network injection']],
  'search-classic': [['foundry iq tool in agent service connects an agent to a new or existing search index']],
};

export function claimMatches(id: string, lines: ReadonlySet<string>) {
  return selectors[id]?.every(group => [...lines].some(line => {
    if (!group.every(term => line.includes(term))) return false;
    return id.startsWith('search-classic-private-') || !/\b(?:no longer|does not|isn't|is not|aren't|are not) (?:include|included|support|supported|require|required|eligible|qualif)/.test(line);
  })) ?? false;
}

export function defenderSuiteQualifier(lines: ReadonlySet<string>) {
  return [...lines].some(line => /^requires:\s*microsoft 365 e3;\s*or office 365 e3 and enterprise mobility \+ security e3\.?$/i.test(line));
}
