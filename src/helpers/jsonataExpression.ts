/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { FumifierCompiled } from 'fumifier';
import fumifier from 'fumifier';

export interface InternalJsonataExpression {
  translateCodeExtract: FumifierCompiled
  translateCodingExtract: FumifierCompiled
  searchSingle: FumifierCompiled
  literal: FumifierCompiled
  initCap: FumifierCompiled
  duplicate: FumifierCompiled
  selectKeys: FumifierCompiled
  omitKeys: FumifierCompiled
  extractNextLink: FumifierCompiled
  bundleToArrayOfResources: FumifierCompiled
  structureMapsToMappingObject: FumifierCompiled
  aliasResourceToObject: FumifierCompiled
  conceptMapToTable: FumifierCompiled
  isEmpty: FumifierCompiled
};

const createExpressions = async (): Promise<InternalJsonataExpression> => ({
  translateCodeExtract: await fumifier('$mapFiltered.code'),
  translateCodingExtract: await fumifier(`
    $result.{
      'system': target,
      'code': code,
      'display': display
    }`),
  searchSingle: await fumifier(`(
    $assert(
      $bundle.total <= 1, 
      'The search ' 
      & $bundle.link[relation='self'].url 
      & ' returned multiple matches - criteria is not selective enough'
    );
    $bundle.entry[search.mode='match'][0].resource
  )`),
  literal: await fumifier(`(
    $r := $searchSingle($query, $params);
    $r.resourceType = 'OperationOutcome' ? $error($string($r));
    $exists($r.resourceType) ? $r.resourceType & '/' & $r.id : undefined
  )`),
  initCap: await fumifier(`(
    $words := $trim($)~>$split(" ");
    ($words.$initCapOnce($))~>$join(' ')
  )`),
  duplicate: await fumifier('$join([1..$times].($str))'),
  selectKeys: await fumifier('$in.$sift($, function($v, $k) {$k in $skeys})'),
  omitKeys: await fumifier('$in.$sift($, function($v, $k) {($k in $okeys)=false})'),

  extractNextLink: await fumifier('link[relation=\'next\'].url'),
  bundleToArrayOfResources: await fumifier('[$bundleArray.entry.resource]'),
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
  )`),
  isEmpty: await fumifier(`(
    $_isEmpty := function($input) {(
      $exists($input) ? (
        $input in ['', null, {}, []] 
        or (
          $type($input) = 'string' 
          and $length($input) > 0 
          and $trim($input) = ''
        )
        ? true 
        : (
          $type($input) = 'object' 
            ? (
              $count(($keys($input).($lookup($input,$)).$not($_isEmpty($)))[$])=0
            )
            : $type($input) = 'array'
              ? (
                $count($input[$_isEmpty($)=false]) = 0
              ) 
              : false
        )
      ) : true
    )};
    $_isEmpty($value)
  )`)
});

const expressions = createExpressions();

export default expressions;
