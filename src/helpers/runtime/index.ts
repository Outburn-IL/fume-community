/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { castToFhir } from './castToFhir';
import { flashMerge } from './flashMerge';
import { finalize } from './finalize';
import { checkResourceId } from './checkResourceId';

export type { CastToFhirOptions } from './castToFhir';
export type { FlashMergeOptions, flashMerge } from './flashMerge';

export default {
  castToFhir,
  checkResourceId,
  flashMerge,
  finalize
};
