import { edgeKinds, kindLabels, maxBytes, maxObjects, objectSchema, version } from './domain';
import pkg from '../package.json' with { type: 'json' };

export function environmentReference() {
  return {
    version, maxBytes, maxObjects,
    objects: objectSchema.options.map(option => {
      const kind = option.shape.kind.value;
      return { kind, name: kindLabels[kind], fields: Object.keys(option.shape) };
    }),
    relationships: Object.entries(edgeKinds).map(([type, [from, to]]) => ({ type, from, to })),
  };
}

const safeChecks = ['dev', 'preview', 'typecheck', 'lint', 'test', 'test:e2e', 'pricing:validate',
  'evidence:validate', 'docs:validate', 'build'] as const;
export function verificationCommands() {
  return safeChecks.map(name => ({ name, invoke: name === 'test' ? 'npm test' : `npm run ${name}`, script: pkg.scripts[name] }));
}
