/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import jsonata from 'jsonata';
import { getSnapshot } from './getSnapshot';
import fumeFuncs, { logInfo, getStructureDefinition } from '../jsonataFunctions';
import { endsWith, initCapOnce, replaceColonsWithBrackets, startsWith } from '../stringFunctions';
import { getElementDefinition } from './getElementDefinition';

export interface PreCompilerFunctions {
  findClosingBrackets: Function
  calcBracketDiffExpr: jsonata.Expression
  calcBracketDiff: Function
  isTypeNameValidExpr: jsonata.Expression
  isTypeNameValid: Function
  eDefSelectorExpr: jsonata.Expression
  eDefSelector: Function
  getMandatoriesOfStructureExpr: jsonata.Expression
  getMandatoriesOfStructure: Function
  getMandatoriesOfElementExpr: jsonata.Expression
  getMandatoriesOfElement: Function
  getJsonElementNameExpr: jsonata.Expression
  getJsonElementName: Function
};

export const funcs: PreCompilerFunctions = {
  // returns the (positive) position of the closing bracket, or the depth change (as a negative)
  findClosingBrackets: (line: string, startPosition: number, carried: number): number => {
    // line: a single line to search for closing brackets
    // startPosition: where to start from. this will be the index of original opening brackets, or 0
    // openingCount: the number of opening brackets counted so far (carried from previous lines)
    // returns (-1 * depth) if not found, or the index of the closing brackets if found
    // TODO: ignore brackets that are inside quoted strings!
    let depth: number = carried;
    if (line === '') return -1 * depth;
    for (let i = startPosition; i < line.length; i++) {
      switch (line[i]) {
        case '(':
          depth++;
          break;
        case ')':
          if (--depth === 0) {
            return i;
          }
          break;
      }
    }
    return -1 * depth;
  },
  // returns the diff between opening and closing parenthesis in  a single line
  calcBracketDiffExpr: jsonata('($arr := $split($str, ""); $count($arr[$="("]) - $count($arr[$=")"]);)'),
  calcBracketDiff: async (line: string): Promise<number> => await funcs.calcBracketDiffExpr.evaluate({}, { str: line }),
  // makes sure the "InstanceOf" decleration contains a (fixed) potential FHIR type and not an expression
  // eslint-disable-next-line @typescript-eslint/quotes, no-useless-escape
  isTypeNameValidExpr: jsonata("$contains($str, \/\\s\/)=false and (($match($str,\/^(http(|s):\/\/|urn:(uuid|oid):).+[^\\s]\/)[0].match=$str) or ($match($str,\/[A-Za-z0-9\\-\\.]{1,64}\/)[0].match=$str) or ($match($str,\/[A-Za-z]([A-Za-z0-9_]){0,254}\/)[0].match=$str))"),
  isTypeNameValid: async (typeName: string): Promise<boolean> => await funcs.isTypeNameValidExpr.evaluate({}, { str: typeName }),

  eDefSelectorExpr: jsonata('$structDef.differential.element[path=$fullPath]'),
  eDefSelector: async (fullPath: string, structDef: object): Promise<object> => await funcs.eDefSelectorExpr.evaluate({}, { fullPath, structDef }),

  getMandatoriesOfStructureExpr: jsonata(`(
        $snapshot := $getSnapshot($structId);
        $rootMandatories := $snapshot.snapshot.element[min>0 and $count($split(id, '.'))=2];
        $res := $rootMandatories{$substringAfter(id, $snapshot.type & '.') : (
          $val := $getMandatoriesOfElement($structId, $substringAfter(id, $snapshot.type & '.'), $getMandatoriesOfStructure);
          $exists($val) ? (
            base.max > '1' or base.max = '*' or max > '1' or max = '*' ? [$val] : $val
          )
        )};
        $res != {} and $count($res) > 0 ? (
          $kv := $spread($res);
          $kvWithBrackets := $kv.{
            $replaceColonsWithBrackets($keys($)[0]): *
          };
          $merge($kvWithBrackets)
        )
      )`),
  getMandatoriesOfStructure: async (structId: string): Promise<any> => {
    const res = await funcs.getMandatoriesOfStructureExpr.evaluate({}, { structId, getSnapshot, getMandatoriesOfElement: funcs.getMandatoriesOfElement, getMandatoriesOfStructure: funcs.getMandatoriesOfStructure, replaceColonsWithBrackets });
    return res;
  },
  getMandatoriesOfElementExpr: jsonata(`
      (
        /* for primitives, return the primitive if it has a fixed value */
        /* for complex types, return an object containing all mandatory  */
        /* decendants that have fixed values down the chain */
        /* the element is taken from the root structure definition 'snapshot.element' array */
        $rootStruct := $getSnapshot($structId);
        $rootStructSnapshot := $rootStruct.snapshot.element;
        
        /* take the element definition of the requested (parent) element */
        $parentElement := $getElementDefinition($structId, $relativePath);
        $fromDefinition := $parentElement.__fromDefinition;

        /* check if returned element is from the root definition */
        $fromDefinition = $rootStruct.url ? (
          /* get the fhirtype name(s) of the parent, for use in polymorphic keys */ 
          $parentElementType := $parentElement.type.(
            $startsWith(code, 'http://hl7.org/fhirpath/System.')
            ? ( /* take type name from extension http://hl7.org/fhir/StructureDefinition/structuredefinition-fhir-type */ 
              extension[url='http://hl7.org/fhir/StructureDefinition/structuredefinition-fhir-type'].valueUrl
            )
            : code
          );
          
          /* get the profile, if set (e.g. slices on extension or il-core-patient.address)*/
          $parentElementProfile := $parentElement.type.profile;
          
          /* get the fixed value if there is one */
          $fixed := (
            $count($parentElementType) = 1 ? ( /* not poly - polies cannot have fixed */
              $fixedKeys := ['fixed','pattern'].($&$initCap($parentElementType));
              $fixedKeys.($lookup($parentElement,$))
            )
          );
          
          /* get the json type of the fixed value */
          $typeOfFixed := $type($fixed);
          
          /* now if fixed is not object, no need to continue */
          $exists($fixed) and $typeOfFixed != 'object' ? (
            $fixed
          ) : (
            /* however if it is an object, it may also have fixed values from underneath */
            /* this is obviously true also when there isn't a fixed value */
            /* take all elements with min>0 that are "under" the requested element */
            $childrenFromRootStruct := $rootStructSnapshot[
              (
                (
                  $startsWith(id, $parentElement.id & '.')
                )
                and (
                  $count($keys($)[
                    $startsWith($, 'fixed') /* there is a fixed[x] */
                    or $startsWith($, 'pattern') /* or patten[x] */
                  ]) > 0 
                  or min > 0 /* or it's just mandatory */
                )
              )
              /* take only those that are a single step under */
              and ($contains($substringAfter(id, $parentElement.id & '.'),'.')=false)
            ];
            /* add the correct json key name to each element */
            $childrenFromRootStruct := $childrenFromRootStruct ~> |$|{'__jsonKey': (
              $lastNode := $split(id,'.')[-1];
              $lastNode.$endsWith($, '[x]') ? 
                $substringBefore($lastNode, '[x]') & $initCap(type[0].code) 
                : $lastNode
            )}|;

            $childrenFromRootStruct := $childrenFromRootStruct ~> |$|{'__kind': (
              $exists(type[0].code) ? $startsWith(type[0].code, 'http://hl7.org/fhirpath/System.') ? 'primitive-type' : $getStructureDefinition(type[0].code).kind
            ),'__val': (
              $getMandatoriesOfElement($structId, $substringAfter(id, $rootStructSnapshot[0].id & '.'), $structureFunction)
            )}|;

            $childrenFromRootStruct := $childrenFromRootStruct ~> |$[$type(__val) = 'object' and __kind = 'primitive-type']|{'__jsonKey': '_' & __jsonKey}|;

            $obj := $childrenFromRootStruct{
              __jsonKey: (
                $exists(__val) ? (
                  base.max > '1' or base.max = '*' or max > '1' or max = '*' ? [__val] : __val
                )
              )
            };
            $fromProfile := (
              $count($parentElementProfile) = 1 ? (
                $structureFunction($parentElementProfile[0])
              )
            );
            $res := $merge([$fixed, $fromProfile, $obj]);
      
            $res != {} and $count($res) > 0 ? (
              $kv := $spread($res);
              $kvWithBrackets := $kv.{
                $replaceColonsWithBrackets($keys($)[0]): *
              };
              $merge($kvWithBrackets)
            )
          )
        ) : (
          /* if returned element is from a different definition than the root, call this function again */
          /* this time on the element's containing definition */
          $fromDefinitionSnapshot := $getSnapshot($fromDefinition);
          $baseType := $fromDefinitionSnapshot.type;
          $relativeElementId := $substringAfter($parentElement.id, $baseType & '.');
          $getMandatoriesOfElement($fromDefinition, $relativeElementId, $structureFunction);
        ); 
      )`),
  getMandatoriesOfElement: async (structId: string, relativePath: string, structureFunction: Function): Promise<any> => {
    const res = await funcs.getMandatoriesOfElementExpr.evaluate({}, { info: fumeFuncs.logInfo, structId, relativePath, getStructureDefinition, getMandatoriesOfElement: funcs.getMandatoriesOfElement, structureFunction, getSnapshot, startsWith, endsWith, initCap: initCapOnce, getElementDefinition, replaceColonsWithBrackets });
    return res;
  },
  getJsonElementNameExpr: jsonata(`
        (
          $path := $element.path;
          $lastNode := $split($path, '.')[-1];
          $substring($lastNode, -3) = '[x]' ? (
            $count($element.type) > 1 ? 
              $possibleKeys := $element.type.(
                $typeCodeInitCap := $uppercase($substring(code, 0, 1)) & $substring(code, 1);
                $substringBefore($lastNode, '[x]') & $typeCodeInitCap;
              );
              $fshKey in $possibleKeys ? $fshKey
              : (
                $typeCode := $element.type.code;
                $typeCodeInitCap := $uppercase($substring($typeCode, 0, 1)) & $substring($typeCode, 1);
                $substringBefore($lastNode, '[x]') & $typeCodeInitCap;
              )
          ) : $fshKey
        )
      `),
  getJsonElementName: async (element: any, fshKey: string): Promise<any> => await funcs.getJsonElementNameExpr.evaluate({}, { element, fshKey, info: logInfo })
};
