/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { getFhirClient } from '../fhirServer';
import thrower from '../thrower';

// cached copy of the capability statement resource
let capabilityStatement: Record<string, any | any[]> = {};

export const capabilities = async (): Promise<Record<string, any> | undefined> => {
  // check if capability statement cached copy is empty
  if (Object.keys(capabilityStatement).length === 0) {
    // try to fetch from server
    try {
      capabilityStatement = await getFhirClient().read('metadata');
    } catch (error) {
      return thrower.throwRuntimeError(`Failed to fetch CapabilityStatement from FHIR server. ${JSON.stringify(error)}`);
    }
  }
  // check that the object is actually a capability statement
  if (!capabilityStatement?.resourceType || typeof capabilityStatement.resourceType !== 'string' || capabilityStatement.resourceType !== 'CapabilityStatement') {
    return thrower.throwRuntimeError('Invalid response from FHIR server: The \'/metadata\' endpoint did not return a CapabilityStatement resource');
  }
  // return the cached capability statement
  return capabilityStatement;
};
