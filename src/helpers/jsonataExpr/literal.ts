/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */
import { searchSingle } from '../fhirFunctions/searchSingle';

// returns the diff between opening and closing parenthesis in  a single line
export const literal = async (query: string): Promise<string | undefined> => {
  const r = await searchSingle(query);
  if (r.resourceType === 'OperationOutcome') {
    throw new Error(String(r));
  }
  if (r?.resourceType) {
    return `${r.resourceType}/${r.id}`;
  } else {
    return undefined;
  }
};
