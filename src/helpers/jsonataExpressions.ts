/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { FumifierCompiled } from 'fumifier';
import fumifier from 'fumifier';

export interface InternalJsonataExpression {
  translateCodeExtract: FumifierCompiled
  translateCodingExtract: FumifierCompiled
  structureMapsToMappingObject: FumifierCompiled
  aliasResourceToObject: FumifierCompiled
  conceptMapToTable: FumifierCompiled
}

const createExpressions = async (): Promise<InternalJsonataExpression> => ({
  translateCodeExtract: await fumifier('$mapFiltered.code'),
  translateCodingExtract: await fumifier(`
    $result.{
      'system': target,
      'code': code,
      'display': display
    }`),
  structureMapsToMappingObject: await fumifier(`
    ($[
      resourceType='StructureMap' 
      and status='active' 
      and useContext[
        code.system = 'http://snomed.info/sct'
        and code.code = '706594005'
      ].valueCodeableConcept.coding[
        system = 'http://codes.fume.health'
      ].code = 'fume'
    ]){
      id: group[name = 'fumeMapping'].rule[name='evaluate'].extension[url = 'http://fhir.fume.health/StructureDefinition/mapping-expression'].valueExpression.expression
    }`
  ),
  aliasResourceToObject: await fumifier('group.element{code: target.code}'),
  conceptMapToTable: await fumifier(`(
    $cm := (resourceType='Bundle' ? [entry[0].resource] : [$]);
  
    $merge(
      $cm#$i.id.{
        $: $merge(
          $distinct($cm[$i].group.element.code).(
            $code := $;
            {
              $code: $cm[$i].group.element[code=$code].target[
                equivalence='equivalent' 
                or equivalence='equal' 
                or equivalence='wider' 
                or equivalence='subsumes'
                or equivalence='relatedto'
              ].code.{
                "code": $, 
                "source": %.%.%.source, 
                "target": %.%.%.target,
                "display": %.display
              }[]
            }
          )
        )
      }
    )
  )`)
});

const expressions = createExpressions();

export default expressions;
