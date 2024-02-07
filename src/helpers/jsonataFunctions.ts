/* eslint-disable no-multi-spaces */
/* eslint-disable no-trailing-spaces */
/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import cache from './cache';
import thrower from './thrower';
import * as stringFuncs from './stringFunctions';
import fhirFuncs from './fhirFunctions';
import { search as fhirSearch } from './client';

import jsonata from 'jsonata';
import { getLogger } from './logger';
import compiler from './parser';
import HL7Dictionary from 'hl7-dictionary';
import config from '../serverConfig';
import runtime from './runtime';
import conformance from './conformance';
import * as v2 from './hl7v2';
import * as objectFuncs from './objectFunctions';

const logger = getLogger();

const flashTemplate = async (fhirType: string) => {
  // fork: ent.
  /* compile has to run twice! don't touch this until you solve it! */
  await compileComplex(fhirType, false, false);
  await compileComplex(fhirType, false, false);

  return await jsonata(`(
    $instanceOf := '${fhirType}';
    
    $not($exists($compiled.compiled)) or $compiled.compiled = false ? $error('Definition of ' & $instanceOf & ' is not compiled!');

    /*$ids := $compiled.elements.id;*/
    /*$sortedIds := $ids@$base[$count($split($,'.'))=2].([$base,$ids[$startsWith($, $base & '.')]]);*/
    /*$sortedElements := $sortedIds@$sid.($compiled.elements[id=$sid]);*/
    /* sort has been moved to snapshot generation, so it is skipped here */
    $compiledSorted := $compiled;

    $fshArray := (
      $compiledSorted.elements[
        $not(id=%.fhirType & '.id') 
        and $not($contains(id,'[x]'))
      ].{
        'id':id,
        'primitive':primitive,
        'fhirType':fhirType,
        'short':short
      }
    ){id: $[-1]}.$spread().(
      $id := $keys($)[0];
      $obj := $lookup($, $id);
      $route := $split($id,'.');
      $fshId := (
        $contains($route[-1],':')?(
          $slice := $split($route[-1], ':');
          $slice[0]&'['&$slice[1]&']'
        ):$route[-1]
      );
      $indent := $join($route#$i[$i>0 and $i<$count($route)-1].('  '));
      $line := $indent & '* ' & $fshId & ($obj.primitive ? ' = undefined') & ' /* <' & $obj.fhirType & '> ' & $obj.short & ' */';
    );
    $fshArray := $append(['Instance: undefined /* Logical id of this artifact */', 'InstanceOf: ' & $instanceOf], $fshArray);
    $join($fshArray, '\r\n')
  )`).evaluate({}, { compiled: cache.compiledDefinitions[fhirType], startsWith: stringFuncs.startsWith });
};

const getMappingListExpr = jsonata('$keys($mappingCacheCompiled).{"id": $}');

const getMappingList = async () => {
  const res = getMappingListExpr.evaluate({}, { mappingCacheCompiled: cache.compiledMappings });
  return await res;
};

// TODO: get from app instance
const fhirVersionMinor = fhirFuncs.fhirVersionToMinor(config.FHIR_VERSION);

const getStructureDefinitionPath = (definitionId: string): any => {
  // fork: os
  const indexed = cache.fhirCacheIndex[fhirVersionMinor].structureDefinitions.byId[definitionId] ?? 
    cache.fhirCacheIndex[fhirVersionMinor].structureDefinitions.byUrl[definitionId] ?? 
    cache.fhirCacheIndex[fhirVersionMinor].structureDefinitions.byName[definitionId];

  if (!indexed) { // if not indexed, throw warning and return nothing
    const msg = 'Definition "' + definitionId + '" not found!';
    logger.warn(msg);
    return undefined;
  } else if (Array.isArray(indexed)) {
    const error = new Error(`Found multiple definition with the same id "${definitionId}"!`);
    logger.error(error);
    throw (error);
  } else {
    return indexed;
  }
};

export const getStructureDefinition = (definitionId: string): any => {
  try {
    const path: string = getStructureDefinitionPath(definitionId); 

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fullDef = require(path); // load file
    // logger.info(`Definition loaded: ${path}`);
    return fullDef;
  } catch (e) {
    return thrower.throwParseError(`A Problem occured while getting the structure definition of ${definitionId}. The error is: ${e}`);
  }
};

const registerTable = async (conceptMapId: string) => {
  // fork: ent.
  const bundle = await fhirSearch('ConceptMap?_id=' + conceptMapId);
  const conceptMapBundleToCacheExpr = `(
    $cm := entry.resource[0][];
  
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
                "target": %.%.%.target
              }[]
            }
          )
        )
      }
    )
  )`;
  const toMerge = await jsonata(conceptMapBundleToCacheExpr).evaluate(bundle);
  cache.tables[conceptMapId] = toMerge[conceptMapId];
  if (cache.tables[conceptMapId] === undefined) {
    return 'Failed to register ConceptMap with id: "' + conceptMapId + '"';
  } else {
    return 'ConceptMap with id "' + conceptMapId + '" has been registered successfully';
  }
};

export const logInfo = (message) => {
  // fork: os
  logger.info(message);
  return undefined;
};

export const logWarn = (message) => {
  // fork: os
  logger.warn(message);
  return undefined;
};

const isEmptyExpr = jsonata(`(
  $exists($value)?(
    $typeOfValue := $type($value);
    $typeOfValue != 'null' ? (
      $typeOfValue != 'string' ? (
        $typeOfValue = 'object' ? (
          $value = {} ? (
            true
            ):(
              /* check all keys of object */
              $boolean($value.*)?false:true;
            )
        ):(
          $typeOfValue = 'array' ? (
            $value = [] ? (
              true
            ):(
              /* check all array values */
            $boolean($value)?false:true
            )
          ):(
            $typeOfValue = 'number' ? (
              false /* a number is regarded as non-empty */
            ):(
              $typeOfValue = 'boolean' ? (
                false /* boolean is regarded as non-empty */
              ):(
                true /* type is a function, regarded as empty */
              )
            )
          )
        )
      ):(
        false
      )
    ):true;
  ):true;    
)`);

const isEmpty = async (value) => {
  // fork: os
  const res = isEmptyExpr.evaluate({}, { value });
  return await res;
};

const compiledExpression = async (expression: string): Promise<jsonata.Expression> => {
  // takes a fume expression string and compiles it into a jsonata expression
  // or returns the already compiled expression from cache
  const key = stringFuncs.hashKey(expression); // turn expression string to a key
  let compiled: any = cache.compiledExpressions.get(key); // get from cache
  if (compiled === undefined) { // not cached
    logger.info('expression not cached, compiling it...');
    const parsedAsJsonataStr = await compiler.toJsonataString(expression);
    compiled = jsonata(parsedAsJsonataStr!);
    cache.compiledExpressions.set(key, compiled);
  };
  return compiled;
};

const transform = async (input, expression: string) => {
  // fork: os
  try {
    logger.info('Running transformation...');

    const expr = await compiledExpression(expression);

    let bindings: Record<string, Function | Record<string, any>> = {};

    // bind all mappings from cache
    const mappingIds: any[] = Array.from(cache.compiledMappings.keys());
    if (mappingIds) {
      mappingIds.forEach((mappingId) => {
        const mapping: any = cache.compiledMappings.get(mappingId);
        bindings[mappingId] = mapping?.function;
      });
    }

    // bind functions
    bindings.__checkResourceId = runtime.checkResourceId;
    bindings.__finalize = runtime.finalize;
    bindings.__castToFhir = runtime.castToFhir;
    bindings.__flashMerge = runtime.flashMerge;
    bindings.reference = fhirFuncs.reference;
    bindings.resourceId = fhirFuncs.resourceId;
    bindings.registerTable = registerTable;
    bindings.initCap = stringFuncs.initCap;
    bindings.isEmpty = isEmpty;
    bindings.matches = stringFuncs.matches;
    bindings.stringify = JSON.stringify;
    bindings.selectKeys = objectFuncs.selectKeys;
    bindings.getMappingList = getMappingList;
    bindings.omitKeys = objectFuncs.omitKeys;
    bindings.startsWith = stringFuncs.startsWith;
    bindings.endsWith = stringFuncs.endsWith;
    bindings.uuid = stringFuncs.uuid;
    bindings.translateCode = fhirFuncs.translateCode;
    bindings.translate = fhirFuncs.translateCode;
    bindings.translateCoding = fhirFuncs.translateCoding;
    bindings.search = fhirFuncs.search;
    bindings.searchSingle = fhirFuncs.searchSingle;
    bindings.literal = fhirFuncs.literal;
    bindings.resolve = fhirFuncs.resolve;
    bindings.warning = logWarn;
    bindings.info = logInfo;
    bindings.parseCsv = stringFuncs.parseCsv;
    bindings.v2parse = v2.v2parse;
    bindings.v2json = v2.v2json;
    bindings.isNumeric = stringFuncs.isNumeric;

    // these are debug functions, should be removed in production versions
    bindings.fhirCacheIndex = cache.fhirCacheIndex;
    bindings.getSnapshot = compiler.getSnapshot;
    bindings.getStructureDefinition = getStructureDefinition;
    bindings.getTable = conformance.getTable;
    bindings.v2dictionary = HL7Dictionary.definitions;
    bindings.v2codeLookup = v2.v2codeLookup;
    bindings.v2tableUrl = v2.v2tableUrl;
    bindings.toJsonataString = compiler.toJsonataString;
    bindings.compiledDefinitions = cache.compiledDefinitions;
    bindings.getMandatoriesOfElement = compiler.getMandatoriesOfElement;
    bindings.getMandatoriesOfStructure = compiler.getMandatoriesOfStructure;
    bindings.getElementDefinition = compiler.getElementDefinition;
    bindings.replaceColonsWithBrackets = compiler.replaceColonsWithBrackets;
    // end of debug functions

    // bind all aliases from cache
    bindings = { ...cache.aliases, ...bindings };

    const res = await expr.evaluate(input, bindings);
    return res;
  } catch (error) {
    logger.error(error);
    throw error;
  }
};

const mappingToJsFunction = (mapping) => {
  // fork: os
  return async (input) => {
    const res = await transform(input, mapping);
    return res;
  };
};

const compileComplex = async (typeId: string, reCompileHCR: boolean, reCompileResource: boolean) => {
  // fork: ent.
  /* compile a complex type definition */
  // NOTES:
  // 1. This is an iterative process! should run until all dependent types are compiled
  // 2. When the type is fully compiled, the compiled version will be returned
  // TODO: Special handling is needed for polymorphic elements

  // This flag is for Handling Circual References (Identifier & Reference in R4)

  const HCR = reCompileHCR ? 'HCR' : '';

  let status: boolean;
  const definition = await compiler.getSnapshot(typeId);

  if (!definition) {
    status = false;
    logger.error(`Couldn't find definition for '${typeId}' in R4 files...`);
  } else {
    const iterationExpression = `(
        /************** < Handling circular references (HCR) > **************/
        /* This is a tricky issue. Identifier.assigner is a Reference*/ 
        /* and Reference.identifier is, well... an Identifier...*/ 
        /* we solve it this way:*/ 
        /*1. In first iteration, identifier is compiled without assigner */ 
        /*2. In second interation, we re-compile identifier with the assigner*/  
        /**** The implementation is spread accross the project, marked with 'HCR'*/
    
    /* try to fetch the compiled version of this definition */
    $compiledFromCache := $lookup($compiledDefinitions, $def.id); 

    /* check if definition is fully compiled already */
    $alreadyCompiled := $exists($compiledFromCache.compiled) and $compiledFromCache.compiled=true;

    /* if not fully compiled, do a compile iteration */  
    $alreadyCompiled=false ?
    
    (  
      /* take snapshot element definitions */
      $elements := $def.snapshot.element#$i[
        $i>0 /* exclude the root element */
        and ($exists(max)=false or max != '0') /* exclude removed elements */
        and ( /* **HCR**: keep Identifier.assigner in 2nd iteration */
          ('${HCR}'='HCR' and base.path='Identifier.assigner') 
          or ($def.type = 'Extension' and base.path = 'Element.extension')
          or $exists(base.path)=false or $not(
            base.path in [ /* exclude those inherited from the basic element type */
            'Element.id', 
            'Element.extension',
            'BackboneElement.modifierExtension',
            "Resource.meta",
            "Resource.implicitRules",
            "Resource.language",
            "DomainResource.text",
            "DomainResource.contained",
            "DomainResource.extension",
            "DomainResource.modifierExtension",
            "Identifier.assigner" /* **HCR**: skip Identifier.assigner in 1st iteration */
            ]
        )) 
      ];

      /* duplicate plymorphic elements by their specific types */
      $elements := $elements.type#$typeIndex.%.(
        $merge(
          [
            $,
            {
              "type": [
                type[$typeIndex]
              ]
            }
          ]
        );
      );
      
      /* actual element compilation */
      $compiledElements := $elements@$element.(
        $type:=(
          /* set type by fhir-type extension, else by code */
          $ext := $element.type.extension[
            url='http://hl7.org/fhir/StructureDefinition/structuredefinition-fhir-type'
          ].valueUrl;
          $ext ? $ext : $element.type.code
        );
        /* force resource logical id to be of type 'id' instead of string */
        $element.base.path = 'Resource.id' ? $type := 'id';
        /* try to fetch element type's compiled definition */
        $compiledType := $lookup($compiledDefinitions, $type);
        
        $compiledFlag = $exists($compiledType.compiled) 
        ? $compiledType.compiled 
        : ($element.base.path = 'Element.extension' ? true : false);
        
        /* if type is compiled, create a compiled element definition */
        $compiledType ? 
            /* append type's children elements */
            $append($merge([$compiledType, { "short": $element.short, "isTypeRoot": true }]),$compiledType.elements[$count($split(id, 'extension'))<2]).(
              /* check if polymorphic */
              $isPoly := $substring($element.id, $length($element.id)-3) ='[x]';
              /* set id (basically - the path) according to current context */
              $id := (
                /* change element id if polymorphic type */
                $isPoly ? $substringBefore($element.id,'[x]') & $uppercase($substring($compiledType.fhirType, 0, 1)) & $substring($compiledType.fhirType, 1)
                : $element.id
              ) & (
                  $endOfId := $substringAfter(id,'.');
                  $endOfId = id ? '' :
                  '.' & $endOfId
                );
              $path := (
                /* change element path if polymorphic type */
                $isPoly ? $substringBefore($element.path,'[x]') & $uppercase($substring($compiledType.fhirType, 0, 1)) & $substring($compiledType.fhirType, 1)
                : $element.path
              ) & (
                  $endOfPath := $substringAfter(path,'.');
                  $endOfPath = path ? '' :
                  '.' & $endOfPath
                );
              $targetProfile := (
                isTypeRoot ? type.targetProfile : $element.type.targetProfile
              );
            
              {
                "id": $id,
                "path": $path,
                "short": short, /* root short from element, children from type */
                "primitive": primitive, /* primitive from type */
                "complex": complex, /* complex from type */
                "fhirType": fhirType, /* fhirType from type */
                "type": type, /* type from type */
                "regex": regex, /* regex from type */
                "compiled": compiled, /* compiled flag from type */
                "mandatory": isTypeRoot = true 
                    ? $element.min = 1 : min = 1, 
                "array": isTypeRoot = true 
                    ? $element.base.max != "1" : (base.max != "1" or array=true),
                "removed": isTypeRoot = true 
                    ? $element.max = "0" : max = "0",
                "targetProfile": $targetProfile,
                "fixed": {
                  "type": $fixedTypeKey:=$keys($element)[$substring($, 0, 5)='fixed'],
                  "value": $lookup($element, $fixedTypeKey)
                } /* fixed from element */
              }
            )              
          
          /* if type isn't compiled, leave element definition as-is, just add compiled=false */
          : $merge([$element,{"compiled": false}])
      );

      /* check if all elements have been compiled */
      $allCompiled := $count($compiledElements[$exists(compiled)=false or compiled=false]) = 0 
        ? true 
        : ($compiledElements[compiled=false].id='Extension.extension'?true:false);

      /* full result structure */
      {
        "id": $def.id,
        "url": $def.url,
        "name": $def.name,
        "short": $def.snapshot.element[0].short, /* take short from root element */
        "primitive": $def.kind='primitive-type',
        "complex": $def.kind='complex-type',
        "resource": $def.kind='resource',
        "isProfile": $def.type != $def.id,
        "fhirType": $def.type,
        "derivation": $def.derivation,
        "basedOn": $def.baseDefinition,
        "compiled": $allCompiled,
        "elements": $compiledElements
      };
    ) 
    /* if it was fully compiled from the beginning, return it as-is */
    : $compiledFromCache;
  )`;
    const result = await jsonata(iterationExpression).evaluate({}, { def: definition, compiledDefinitions: cache.compiledDefinitions });
    if (result.compiled) {
      logger.info(`Definition for complex type '${typeId}' compiled successfully`);
    }
    cache.compiledDefinitions[typeId] = result;
    status = result.compiled;
    if ((!status) && definition.kind === 'resource' && !reCompileResource) {
      status = await compileComplex(typeId, false, true);
    }
  }
  return status;
};

const cacheMapping = (mappingId: string, mappingExpr: string) => {
  // fork: os
  const mappingFunc = mappingToJsFunction(mappingExpr);
  const cacheEntry = {
    expression: mappingExpr,
    function: mappingFunc
  };
  cache.compiledMappings.set(mappingId, cacheEntry);
};

export const pretty = async (expression: string): Promise<string> => {
  let indentLevel: number = 0;
  const exprLen: number = expression.length;
  let prettyExpr: string = '';
  let currentChar: string;
  let indent: string = '';
  let stringOpening: string = ''; // if we are inside a string, this will hold the opening quote symbol (single/double)
  let closingBracket: string = '';
  let openingBracket: string = '';
  const bracketMap = { '(': ')', '[': ']', '{': '}' };

  for (let i = 0; i < exprLen; i++) {
    currentChar = expression.charAt(i);
    switch (currentChar) {
      case '(':
      case '[':
      case '{':
        if (stringOpening === '') {
          openingBracket = currentChar;
          closingBracket = bracketMap[openingBracket];
          indentLevel++;
          if (expression.charAt(i + 1) === closingBracket) {
            prettyExpr += currentChar;
          } else {
            indent = await stringFuncs.duplicate('  ', indentLevel);
            prettyExpr += currentChar + '\n' + indent;
          }
        } else {
          prettyExpr += currentChar;
        };
        break;
      case ')':
      case ']':
      case '}':
        if (stringOpening === '') {
          if (indentLevel > 0) {
            indentLevel--;
          };
          if (expression.charAt(i - 1) === openingBracket) {
            prettyExpr += currentChar;
          } else {
            indent = await stringFuncs.duplicate('  ', indentLevel);
            prettyExpr += '\n' + indent + currentChar;
          }
        } else {
          prettyExpr += currentChar;
        }
        break;
      case ',':
      case ';':
        if (stringOpening === '' && !(expression.charAt(i + 1) === '\r' || expression.charAt(i + 1) === '\n')) {
          prettyExpr += currentChar + '\n' + indent;
        } else {
          prettyExpr += currentChar;
        }
        break;
      case '"':
      case '\'':
        stringOpening = (stringOpening === currentChar && (expression.charAt(i - 1) !== '\\' || expression.charAt(i - 2) === '\\')) ? '' : currentChar;
        prettyExpr += currentChar;
        break;
      case '\n':
      case '\r':
        if (stringOpening === '' && expression.charAt(i - 1) !== '\\' && !(expression.charAt(i + 1) === '\r' || expression.charAt(i + 1) === '\n')) {
          // it's an unescaped newline symbol (\n or \r) not followed by the other one
          prettyExpr += currentChar + indent;
        } else {
          prettyExpr += currentChar;
        }
        break;
      default:
        prettyExpr += currentChar;
    }
  };
  return prettyExpr;
};

export default {
  transform,
  flashTemplate,
  mappingToJsFunction,
  cacheMapping,
  getStructureDefinition,
  getStructureDefinitionPath,
  logInfo,
  pretty
};
