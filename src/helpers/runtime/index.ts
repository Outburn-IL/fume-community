/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { castToFhir } from './castToFhir';
import { checkResourceId } from './checkResourceId';
import { finalize } from './finalize';
import { flashMerge } from './flashMerge';

export type { CastToFhirOptions } from './castToFhir';
export type { flashMerge, FlashMergeOptions } from './flashMerge';

export default {
  castToFhir,
  checkResourceId,
  flashMerge,
  finalize
};
