/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import type { FhirResource } from '../../types/FhirResource';
import { uuid } from '../stringFunctions';
import thrower from '../thrower';

export const reference = (resource: FhirResource | undefined): string | undefined => {
  if (typeof resource === 'undefined') return undefined;
  // Check that it is a FHIR resource
  if (Array.isArray(resource) || Object.keys(resource).length === 0 || typeof resource !== 'object' || !resource?.resourceType) {
    return thrower.throwRuntimeError('\'$reference()\' recieved a value that is not a FHIR resource');
  }
  return 'urn:uuid:' + uuid(JSON.stringify(resource));
};
