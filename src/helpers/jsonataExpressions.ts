/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { FumifierCompiled } from 'fumifier';
import fumifier from 'fumifier';

export interface InternalJsonataExpression {
  translateCodeExtract: FumifierCompiled
  translateCodingExtract: FumifierCompiled
}

const createExpressions = async (): Promise<InternalJsonataExpression> => ({
  translateCodeExtract: await fumifier('$mapFiltered.code'),
  translateCodingExtract: await fumifier(`
    $result.{
      'system': target,
      'code': code,
      'display': display
    }`)
});

const expressions = createExpressions();

export default expressions;
