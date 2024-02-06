/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

export type { CastToFhirOptions } from './castToFhir';
export type  { FlashMergeOptions, flashMerge } from './flashMerge';

import { castToFhir } from './castToFhir';
import { flashMerge } from './flashMerge';
import { finalize } from './finalize';
import { checkResourceId } from './checkResourceId';

export default {
    castToFhir,
    checkResourceId,
    flashMerge,
    finalize
};