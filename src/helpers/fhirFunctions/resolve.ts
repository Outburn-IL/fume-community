/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { getFhirClient } from '../fhirServer';
import thrower from '../thrower';

export const resolve = async (reference: string): Promise<Record<string, any> | undefined> => {
  // TODO: enable input to be a reference object, and handle logical references (search by identifier)
  // TODO: handle internal bundle and contained references
  if (reference.includes('?')) return thrower.throwRuntimeError(`The $resolve function only supports literal references. Got: '${reference}'`);
  let resource;
  try {
    resource = await getFhirClient().read(reference);
  } catch (error) {
    return thrower.throwRuntimeError(`Failed to resolve reference '${reference}'. ${JSON.stringify(error)}`);
  }
  if ((resource.resourceType === 'Bundle' && !reference.startsWith('Bundle'))) {
    return thrower.throwRuntimeError(`The $resolve function can only resolve a reference to a single resource. Response from FHIR server is a Bundle. Reference: '${reference}'`);
  }
  return resource;
};
