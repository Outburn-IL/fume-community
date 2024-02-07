/* eslint-disable @typescript-eslint/restrict-template-expressions */

/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import jsonata from 'jsonata';
import expressions from './helpers/jsonataExpression';
import fhirFuncs from './helpers/fhirFunctions';
import objectFuncs from './helpers/objectFunctions';
import {
  parseCsv,
  splitToLines,
  hashKey,
  startsWith,
  endsWith,
  initCapOnce,
  substringBefore,
  substringAfter,
  duplicate,
  initCap,
  matches,
  uuid,
  isNumeric
} from './helpers/stringFunctions';
import thrower from './helpers/thrower';
import runtime, { CastToFhirOptions, FlashMergeOptions } from './helpers/runtime';
import { getStructureDefinition } from './helpers/conformance';
import { v2json } from './helpers/hl7v2';
import cache from './helpers/cache';
import config from './config';
import { getLogger } from './helpers/logger';
// TODO: add support for multiline contexts and values
// TODO: support single line comments using "//"

interface PreCompilerFunctions {
  findClosingBrackets: Function
  calcBracketDiffExpr: jsonata.Expression
  calcBracketDiff: Function
  isTypeNameValidExpr: jsonata.Expression
  isTypeNameValid: Function
  eDefSelectorExpr: jsonata.Expression
  eDefSelector: Function
  buildSnapshotExpr: jsonata.Expression
  buildSnapshot: Function
  getDescendantElementDefExpr: jsonata.Expression
  getDescendantElementDef: Function
  getElementDefinitionExpr: jsonata.Expression
  getElementDefinition: Function
  getMandatoriesOfStructureExpr: jsonata.Expression
  getMandatoriesOfStructure: Function
  getMandatoriesOfElementExpr: jsonata.Expression
  getMandatoriesOfElement: Function
};

const funcs: PreCompilerFunctions = {
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

  getDescendantElementDefExpr: jsonata(`
  (
    /*$typeSnapshot := $getStructureDefinition($fhirType).snapshot.element;*/
    $typeSnapshot := $getSnapshot($fhirType).snapshot.element;
    $edef := $typeSnapshot[path = $join([$fhirType,$path],'.') or path = $join([$fhirType,$substringBefore($path,'[')],'.') or ($join([$fhirType,$path],'.') in type.code.($substringBefore(%.%.path,'[x]') & $initCap($))  ) ][0];
    $exists($edef) ? $edef : (
      /* this is a nested child of another type */
      /* first, build a possible parent paths array */
      
      $pathNodes := $split($path, '.');
      
      $pathIncrements := $pathNodes#$i[$i<($count($pathNodes)-1)].($join([$fhirType,$pathNodes#$j[$j<$i],$],'.'));
      
      /* try to get deepest parent */
      $nearestParent := $typeSnapshot[path in $pathIncrements or $exists(__polyPaths[$ in $pathIncrements])][-1];
      /* if no parent found - it's an invalid path! throw error */
      $exists($nearestParent) ? 
      (
        /* construct a new path, relative to the parent found */
        $parentPath := $nearestParent.path ~> $substringAfter($fhirType&'.');
              
        $newRelativePath := (
          $count($nearestParent.type)=1 
          ? $path ~> $substringAfter($parentPath&'.')
          : (
            $typedPath := ($nearestParent.__polyPaths[$ in $pathIncrements] ~> $substringAfter($fhirType&'.'));
            $path ~> $substringAfter($typedPath&'.')
          )
        );
        
        /* recurse through this function */
        
        /* THIS IS WHERE PROBLEM IS !! FOUND value[x]! need to take type name from end of requested path! */
        
        $parentType := (
          $count($nearestParent.type)=1 
          ? $nearestParent.type[0].code
          : (
            /* first find the increment that equals to one of the polypaths. */
            /* from this we can extract the type name */
            $typedPath := $nearestParent.__polyPaths[$ in $pathIncrements];
            /* now select the right type entry */
            $nearestParent.type[$endsWith($typedPath,$initCap(code))].code;
          )
        );
        $getChildOfBaseType($parentType,$newRelativePath);
      )
    )
  )`),
  getDescendantElementDef: async (fhirType: string, path: string): Promise<any> => {
    if (fhirType === 'BackboneElement' && !['id', 'extension', 'modifierExtension'].includes(path)) return undefined;
    return await funcs.getDescendantElementDefExpr.evaluate({}, { info: getLogger().info, fhirType, path, getSnapshot, getStructureDefinition, getChildOfBaseType: funcs.getDescendantElementDef, initCap: initCapOnce, endsWith });
  },
  buildSnapshotExpr: jsonata(`
  /* this script builds a snapshot of a StructureDefinition */
  /* TODO: fix order of slice block's children (done - but needs further testing) */
  /* input parameters are $rootType and $path */
  /* examples:    */
  /*   $rootType := 'il-core-patient';*/
  /*   $rootType := 'bp';*/
  /*   $rootType := 'Patient';*/
  /*   $path := 'Observation.code.coding';*/
  (
    $toPolyPaths := function($path, $polyTypes, $sourceDefinition) {(
      /* gets a path of an [x] element and an array of types. returns an array of fsh paths with type name */
      $assert($endsWith($path,'[x]'), 'Error reading structure definition '&$sourceDefinition&', path '&$path&' has multiple datatypes but does not end with [x]!');
      $assert($count($split($path,'[x]'))=2, 'Error reading structure definition '&$sourceDefinition&', path '&$path&' has nested polymorphic [x] elements!');
      $polyTypes.($substring($path,0,$length($path)-3) & $initCap($));
    )};
    
    $toFshPath := function($elementId) {(
      /* transform an element id into a FSH path */
      /* TODO: handle polymorphism */
      $nodes := $split($elementId, '.');
      (($nodes.$join($split(':')#$i.(
        $i = 0 ? $ : '['&$&']'
      )))#$j[$j>0])~>$join('.')
    )};
    
    $getAncestors := function($typeId, $getter) {(
      /* returns an array of StructureDefinitions of all ancestors */
      /* up to the base definition (the first who's derivation isn't 'constraint') */
      $start := $getter($typeId);
      $derivation := $start.derivation;
      $next := $derivation='constraint' and $exists($start.baseDefinition) 
                ? [$append($getAncestors($start.baseDefinition, $getter), $start)]
                : [$start]
    )};
  
    $findNearestBasePath := function($path, $elementArray){(
      /* searches the element tree for the base element this element should be under */
      $pathNodes := $path.$split('.');
      /* create a list of all possible sub-paths of the path */
      $pathIncrements := $pathNodes#$i.($join([$pathNodes#$j[$j<$i],$],'.'));
      /* select deepest increment found in base definitions */
      $elementArray[(__derivation='specialization' or $exists(__derivation)=false) and (__snapshotPath in $pathIncrements or $count(__polyPaths[$ in $pathIncrements])>0)][-1].__snapshotPath
    )};
    
    /* perform getAncestors on rootType */
    $ancestors := $getAncestors($rootType, $getStructureDefinition);
    
    /* get all differentials and add properties to them */
    $ancestorDiffs := $ancestors.(
        $merge([(
          derivation='specialization' 
          ? (
            /* this is a base definition so its snapshot should be reliable */
            /* these elements will also be used for "base" object */
            /* so if it's missing it'll be created here */
            snapshot.{
              'element': element.(
                [
                  {
                    'base':{
                      'path': path, 
                      'min': min, 
                      'max': max
                    }
                  },
                  $
                ] ~> $merge()
              )
            }
          )
          : (
            /* this is a profile so its snapshot should not be trusted */
            /* bring differntials instead */
            differential
          )
        ),{'__url': url, '__derivation': derivation}])
      ).element.($merge([(
      $noRootPath := $join($split(path, '.')#$i[$i>0],'.');
      $noRootId := $join($split(id, '.')#$i[$i>0],'.');
      /* TODO: identify descendants of slices by their relative places in   */
      /*       the element list instead of relying on ":" in their id's  */
      $hasSlices := $contains(id, ':');
      $baseType := $ancestors[-1].type;
      $snapshotPath := $join([$baseType, $noRootPath],'.');
      $snapshotId := $hasSlices ? $join([$baseType, $noRootId],'.') : $snapshotPath;
      /* if snapshot id does not contain ":" than use path instead of id to generate FSH path */
      {
        '__fromDefinition': %.__url, 
        '__derivation': %.__derivation,
        '__snapshotPath': $snapshotPath,
        '__snapshotId': $snapshotId,
        '__fshPath': $toFshPath($snapshotId),
        '__polyPaths': $count(type)>1?$toPolyPaths($snapshotPath, type.code, %.__url)
      }
    ),$]));
    
    /* merge differentials by snapshotId (the reconstructed element.id's) */
    $snapshots := $ancestorDiffs{__snapshotId : $merge($)}.*;
    
    /* add __nearestBase[Path,Type] attributes to elements */
    $snapshots := $snapshots.(
      [
        (
          $nbp := $findNearestBasePath(__snapshotPath, $ancestorDiffs);
          $nbt := $snapshots[__snapshotPath = $nbp][0].type;
          {
            '__nearestBasePath': $nbp,
            '__nearestBaseType': $nbt
          }
        ),
        $
      ] ~> $merge  
    );
  
    /* reorder elements according to __nearestBasePath */
    $snapshots := $snapshots{
      __nearestBasePath: $
    }.*;
  
    /* where snapshot path is equal to nearest base path  */
    /*    => merge with base element (the first that has the same path) */
    $snapshots := $snapshots@$s1.(
      $s1.__snapshotPath = $s1.__nearestBasePath
      ? [
          $snapshots[__snapshotPath = $s1.__snapshotPath][0],
          $s1
        ] ~> $merge
      : $s1
    );
  
    $snapshots := $snapshots.(
      __snapshotPath != $ancestors[-1].type and $exists(type)=false and $exists(contentReference)=false
      ? (
        /* has no type yet, bring from base */
        $isPolyParent := $endsWith(__nearestBasePath,'[x]');
        $polyPrefix := $isPolyParent ? $substringBefore(__nearestBasePath,'[x]');
        $selectedType := $isPolyParent ? path ~> $substringAfter($polyPrefix);
        $nearestType := $isPolyParent ? (
          (__nearestBaseType.code)[$lowercase($)=$lowercase($selectedType)]
        ) : __nearestBaseType[0].code;
        $isPolyParent 
        ? ([{'type': [{'code': $nearestType}]},$]~>$merge) 
        : (
          $relativePath := __snapshotPath ~> $substringAfter(__nearestBasePath&'.');
          $baseDef := $getChildOfBaseType($nearestType,$relativePath);
          [$baseDef,$]~>$merge
        )
      )
      : $
    );

    $ids := $snapshots.__snapshotId;
    $sortedIds := $ids@$base[$count($split($,'.'))=2].([$base,$ids[$startsWith($, $base & '.')]]);
    $sortedElements := $sortedIds@$sid.($snapshots[__snapshotId=$sid]);

    $getMissingSliceChildren := function($sliceDeclerationId, $elements){(
      /*now let's try to fill in all the missing elements under slices */
      $sliceName := $split($sliceDeclerationId, ':')[-1];
      $sliceBaseId := $substringBefore($sliceDeclerationId, ':' & $sliceName);
      $sliceChildren := $elements[$startsWith(id,$sliceDeclerationId&'.')];
      /*$info($sliceChildren);*/
      $sliceBaseChildren := $elements[$startsWith(id,$sliceBaseId&'.')];
      /* filter out base poly children that have a chosen type in slice */
      $sliceBaseChildren := $count($sliceBaseChildren) >0 ? $sliceBaseChildren[$not($endsWith(id,'[x]') and __nearestBasePath in $sliceChildren.__nearestBasePath)];
      /* filter out base children that exist in slice */
      $sliceBaseChildren := $count($sliceBaseChildren) >0 ? $sliceBaseChildren[$not(__snapshotPath in $sliceChildren.__snapshotPath)];
      /* replace fshPath, id, and snapshotId */ 
      $sliceBaseChildren := $sliceBaseChildren.(
        $sliceHeadIdNoRoot := $substringAfter($sliceBaseId,'.');
        $sliceHeadFshPath := $sliceHeadIdNoRoot & '[' & $sliceName & ']';
        $currentRelativeId := $substringAfter(id, $sliceBaseId & '.');
        $currentRelativeFshPath := $substringAfter(__fshPath, $sliceHeadIdNoRoot & '.');
        $finalId := $sliceDeclerationId & '.' & $currentRelativeId;
        $finalFshPath := $sliceHeadFshPath & '.' & $currentRelativeFshPath;
        
        $merge([$,{
          '__fshPath': $finalFshPath,
          '__snapshotId': $finalId,
          'id': $finalId
        }])
      )
    )};

    $sortedElements := $sortedElements@$e.(
      $isSliceDecleration := $not($contains($split($e.id,':')[-1],'.'));
      $isSliceDecleration 
      ? $append($e,$getMissingSliceChildren($e.id, $sortedElements)) 
      : $e
    );
  
    $count($sortedElements)>0 ? $merge([$getStructureDefinition($rootType),{'snapshot': {'element': $sortedElements}}]) : $error('Failed building snapshot for ' & $rootType);
  )`),
  buildSnapshot: async (rootType: string, path: string): Promise<any> => await funcs.buildSnapshotExpr.evaluate({}, {
    info: getLogger().info,
    rootType,
    path,
    getStructureDefinition,
    initCap: initCapOnce,
    startsWith,
    endsWith,
    getChildOfBaseType: funcs.getDescendantElementDef
  }),
  getElementDefinitionExpr: jsonata(`(
    
    $snapshot := $getSnapshot($rootType);
    $snapshot ? (
      $fhirType := $snapshot.type;
      
      $pathNodes := $split($path, '.');
      
      $pathIncrements := $pathNodes#$i.($join([$pathNodes#$j[$j<$i],$],'.'));
      
      /*$eDef := $snapshot.snapshot.element[($fhirType & "." & __fshPath) in $pathIncrements or $count(__polyPaths[$ in $pathIncrements])>0][-1];*/
      $eDef := $snapshot.snapshot.element[($fhirType & "." & __fshPath) in $pathIncrements or __fshPath in $pathIncrements or $count(__polyPaths@$p[$p in $pathIncrements or $p in ($pathIncrements.($fhirType & '.' & $))])>0][-1];
      $eDef ? (
        $eDef.($fhirType & '.' & __fshPath) = $path or $path in $eDef.__polyPaths
        ? ( /* it's an exact match */
          $endsWith($path, '[x]')
          ? $throwError('Path '&$path&' in definition '&$rootType&' is polymorphic. Choose one of the following: '& $join($eDef.__polyPaths.$substringAfter($, $fhirType&'.'),', '))
          : $eDef
        ) 
        : (
          /* not an exact match but a parent match */
          $endsWith($path, '[x]')
          ? $throwError('Path '&$path&' in definition '&$rootType&' is polymorphic. Choose one of the following: '& $string($eDef.__polyPaths.($substringAfter($,$rootType&'.'))))
          : (
            $polyPath := $eDef.__polyPaths[$ in $pathIncrements];
            
            $containingType := (
              $count($eDef.type)=1 
              ? $eDef.type.code
              : (
  
                $eDef.type[$endsWith($polyPath, code)].code;
              )
            );
            $relativePath := (
              $exists($polyPath) 
              ? $substringAfter($path, $polyPath&'.')
              : $substringAfter($path, $eDef.__fshPath&'.')
            );
            $getDescendantElementDef($containingType, $relativePath);
          )
        )
      ) : (
        $throwError('Failed to find any element in '&$rootType&" who's path is "&$path&' or any of its parents')
      )
    ) : $throwError('Failed to get snapshot for '&$rootType);  
  )`),
  getElementDefinition: async (rootType: string, path: string): Promise<any> => await funcs.getElementDefinitionExpr.evaluate({}, {
    info: getLogger().info,
    throwError: thrower.throwParseError,
    getSnapshot,
    rootType,
    path,
    getDescendantElementDef: funcs.getDescendantElementDef,
    endsWith,
    initCap: initCapOnce
  }),
  getMandatoriesOfStructureExpr: jsonata(`(
    $snapshot := $getSnapshot($structId);
    $rootMandatories := $snapshot.snapshot.element[min>0 and $contains(__fshPath, '.')=false];
    $rootMandatories{__fshPath : (
      $val := $getMandatoriesOfElement($structId, __fshPath, $getMandatoriesOfStructure);
      $exists($val) ? (
        base.max > '1' or base.max = '*' or max > '1' or max = '*' ? [$val] : $val
      )
    )}
  )`),
  getMandatoriesOfStructure: async (structId: string): Promise<any> => await funcs.getMandatoriesOfStructureExpr.evaluate({}, { structId, getSnapshot, getMandatoriesOfElement: funcs.getMandatoriesOfElement, getMandatoriesOfStructure: funcs.getMandatoriesOfStructure }),
  getMandatoriesOfElementExpr: jsonata(`(
    /* for primitives, return the primitive if it has a fixed value */
    /* for complex types, return an object containing all mandatory  */
    /* decendants that have fixed values down the chain */
    /* the element is taken from the root structure definition 'snapshot.element' array */
    $rootStructSnapshot := $getSnapshot($structId).snapshot.element;
    /* take the element definition of the requested (parent) element */
    $parentElement := $rootStructSnapshot[__fshPath=$relativePath];
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
      $count($parentElementType) = 1 ? ( /* not poly - pollies cannot have fixed */
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
        $exists(__fshPath) /* not the root element */
        and (
          $startsWith(__fshPath, $relativePath & '.') /* fshPath begins with path */
          and __fshPath != $relativePath /* but not equal to it */
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
      and ($contains($substringAfter(__fshPath, $relativePath & '.'),'.')=false)
    ];
    $obj := $childrenFromRootStruct{
      $split(__fshPath,'.')[-1]: (
        $val := $getMandatoriesOfElement($structId, __fshPath, $structureFunction);
        $exists($val) ? (
          base.max > '1' or base.max = '*' or max > '1' or max = '*' ? [$val] : $val
        )
      )
    };
    $fromProfile := (
      $exists($parentElementProfile) ? (
        $structureFunction($parentElementProfile)
      )
    );
    $res := $merge([$fixed, $fromProfile, $obj]);

    $res != {} and $count($res) > 0 ? $res
    )
  )`),
  getMandatoriesOfElement: async (structId: string, relativePath: string, structureFunction: Function): Promise<any> => await funcs.getMandatoriesOfElementExpr.evaluate({}, {
    info: getLogger().info,
    structId,
    relativePath,
    getMandatoriesOfElement: funcs.getMandatoriesOfElement,
    structureFunction,
    getSnapshot,
    startsWith,
    initCap: initCapOnce
  })
};

const getSnapshot = async (rootType: string) => {
  // fetch a snapshot from cache or build it if not chached
  if (cache.snapshots[rootType]) return cache.snapshots[rootType];
  const snapshot = await funcs.buildSnapshot(rootType);
  cache.snapshots[rootType] = snapshot;
  return snapshot;
};

const eDefs: Record<string, any> = {};

const getElementDefinition = async (rootType: string, path: string) => {
  if (Object.prototype.hasOwnProperty.call(eDefs, rootType)) {
    if (typeof eDefs[rootType] === 'object' && Object.prototype.hasOwnProperty.call(eDefs[rootType], path)) {
      return eDefs[rootType][path];
    }
  }
  // get the element definition from a structure definition by path
  const eDef = await funcs.getElementDefinition(rootType, path);
  if (eDef) {
    if (Object.prototype.hasOwnProperty.call(eDefs, rootType)) {
      eDefs[rootType][path] = eDef;
    } else {
      eDefs[rootType] = {};
      eDefs[rootType][path] = eDef;
    }
    return eDef;
  }
  // when not found, it's not an error. it might just be a nested type's child
  return undefined;
};

const toJsonataString = async (inExpr: string): Promise<string | undefined> => {
  console.time('Parse to JSONATA');
  let res: string | undefined;

  // decrlare FLASH block variables:
  let rootIndentOffset: string; // the padding of the first declerations in current flash block
  let prevRuleDepth: number; // the number of indentations the last rule had
  let prevRuleNodes: number[]; // the number of chained nodes the last rule had (no chain is 1)
  let rootStructDef: any; // the current flash block's StructureDefinition resource
  let instanceDeclerationFlag: boolean = false; // there was an Instance decleration somewhere in the current flash block
  let instanceOfDeclerationFlag: boolean = false; // there was an InstanceOf decleration somewhere in the current flash block
  let ruleClosureString: string = ''; // add this string to the end of the flash block - it closes all open rules
  let flashBlockHanging: boolean = false; // true if we are inside a flash block
  let currentFshPath: string = ''; // the absolute path relative to root base type

  // declare expression global variables:
  let currentBracketDepth: number = 0; // count global hanging open parenthesis
  let expressionHasFlash: boolean = false; // there is some FLASH inside the expression

  const lineParser = async (line: string, index: number, allLines: string[]) => {
    // line by line parsing into native jsonata expressions
    const trimmedLine = line.trim(); // trim line
    // check if line is an Instance decleration
    const isInstanceDeclaration = trimmedLine.startsWith('Instance:');
    // check if line is InstanceOf decleration
    const isInstanceOfDeclaration = trimmedLine.startsWith('InstanceOf:');
    // raise expressionHasFlash flag if Instance[Of] was declared
    expressionHasFlash = expressionHasFlash || isInstanceDeclaration || isInstanceOfDeclaration;
    // check if line is a FLASH rule
    const isRule = await isLineFlashRule(trimmedLine);
    if (isInstanceDeclaration) {
      // this line starts with 'Instance:'
      if (instanceOfDeclerationFlag) {
        // this instance decleration comes after an InstanceOf
        return thrower.throwParseError(`'Instance:' decleration must come *before* the 'InstanceOf:' decleration in a FLASH block: '${trimmedLine}'`);
      };
      if (instanceDeclerationFlag) {
        // this is the second instance decleration in current flash block
        return thrower.throwParseError(`only a single 'Instance:' decleration is allowed in each FLASH block. Found: '${trimmedLine}'`);
      };
      // raise flag so we can trace Instance[Of] parse errors in the current flash block
      instanceDeclerationFlag = true;
      // register open flash block
      flashBlockHanging = true;
      // extract the expression that comes after Instance:
      // @ts-expect-error
      const after: string = substringAfter(trimmedLine, 'Instance:');
      // the indentation in Instance: is the root indentation
      // @ts-expect-error
      rootIndentOffset = substringBefore(line, 'Instance:');
      // set this so indentations of following rules can be validated
      prevRuleDepth = 0;
      prevRuleNodes = [];
      // return the native jsonata corresponding to the "Instance:" decleration
      return `${rootIndentOffset}$__flashInstanceId := ${after}`;
    };
    if (isInstanceOfDeclaration) {
      // current line is an "InstanceOf:" declaration
      if (instanceOfDeclerationFlag) {
        // this is the second InstanceOf decleration in current flash block
        return thrower.throwParseError(`only a single 'InstanceOf:' decleration is allowed in each FLASH block. Found: '${trimmedLine}'`);
      };
      // raise this flag so we can trace Instance[Of] parsing errors in the current flash block:
      instanceOfDeclerationFlag = true;
      // register that we are in an open flash block
      flashBlockHanging = true;
      // extract the InstanceOf: *** part
      // @ts-expect-error
      const rootTypeId: string = (substringAfter(line, 'InstanceOf:')).trim();
      // make sure it's a potentially valid FHIR type
      if (!(await funcs.isTypeNameValid(rootTypeId))) return thrower.throwParseError(`value after "InstanceOf:" must be a valid type name, id or URL, and cannot be an expression. Found: "${rootTypeId}"`);
      // try to fetch the type's StructureDefinition resource
      rootStructDef = await getStructureDefinition(rootTypeId);
      // throw error if StructureDefinition can't be fetched
      if (rootStructDef === undefined) return thrower.throwParseError(`can't find definition of ${rootTypeId}!`);
      currentFshPath = rootStructDef.type;
      // the indentation of InstanceOf:
      const indent: string | undefined = substringBefore(line, 'InstanceOf:');
      // might need to put a semicolon at the beginning of this line, this var will hold it
      let prefix: string;
      if (rootIndentOffset === undefined) {
        // this means it's an InstanceOf declaration without a preceding
        // "Instance:", so there is no need for a semicolon at the start
        prefix = '';
      } else {
        // there's a preceding Instance: declaration, so we may need to terminate it with a semicolon
        const prevline: string = allLines[index - 1];
        const isSingleLineExpression = prevline === line;
        const isPrevLineTerminated = prevline.trimEnd()[-1] === ';';
        prefix = !(isSingleLineExpression || isPrevLineTerminated) ? ';' : '';
      };
      if (rootIndentOffset !== undefined && indent !== rootIndentOffset) {
        // different indetations for Instance: vs. InstanceOf
        return thrower.throwParseError('indentation of "InstanceOf:" must be the same as "Instance:"!');
      };
      // if rootIndent was already set than it's the same as current indent.
      // if it wasn't set, we need to set it now:
      rootIndentOffset = indent ?? '';
      prevRuleDepth = 0;
      prevRuleNodes = [];

      // set resourceType if it's an instance of a resource or resource profile
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      const resourceType = rootStructDef?.kind === 'resource' ? `'${rootStructDef?.type}'` : 'undefined';

      // set meta with profile tag if it's a resource profile
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      const meta = rootStructDef?.kind === 'resource' && rootStructDef?.derivation === 'constraint' ? `{'profile': ['${rootStructDef?.url}']}` : 'undefined';
      // create a regex test expression for the id if it's a resource
      const testId = resourceType === 'undefined' ? '$__flashInstanceId' : '$__checkResourceId($__flashInstanceId)';

      // mandatory fixed elements
      const mandatoryElementsObj = await funcs.getMandatoriesOfStructure(rootTypeId);
      const mandatoriesAsString = typeof mandatoryElementsObj === 'object' ? JSON.stringify(mandatoryElementsObj) : '{}';
      const res = `${prefix}${indent}$__flashInstance := $merge([{'resourceType': ${resourceType}},{'id': ${testId}, 'meta': ${meta}},${mandatoriesAsString}]);`;
      return res;
    };

    if (flashBlockHanging && isRule) {
      // this line is a flash rule
      if (!instanceOfDeclerationFlag) return thrower.throwParseError(`rules cannot appear before an "InstaceOf:" declaration. Rule: "${trimmedLine}"`);
      // check indentation
      //
      // root indentation (Instance & InstanceOf) is regarded as zero
      // any root rule is 2
      // when indentation is lower than previous one, need to close previous rules - depending on the diff
      // when indentation is higher than previous one it can only be by 2 spaces - no need to close previous rule
      // when indentation is the same - close previous rule
      // @ts-expect-error
      const indent: string = substringBefore(line, '* '); // the indentation of this rule in actual spaces
      const ruleDepth: number = (indent.length - rootIndentOffset.length) + 2; // any root rule is 2, so all rules are shifted by 2
      if (ruleDepth < 2) return thrower.throwParseError(`expected indentation of at least ${rootIndentOffset.length} spaces, got ${indent.length} instead. Rule: ${line}`);
      if (ruleDepth > prevRuleDepth + 2) return thrower.throwParseError(`expected indentation of max ${rootIndentOffset.length + prevRuleDepth} spaces, got ${indent.length} instead. Rule: ${line}`);
      if (ruleDepth % 2 !== 0) return thrower.throwParseError(`rule indentation must be in increments of two spaces. Rule: ${line}`);
      // indentation correct
      let rulesToClose: number; // how many rules we need to close at the beginning of this line
      if (ruleDepth < prevRuleDepth) {
        const steps: number = ((prevRuleDepth - ruleDepth) / 2);
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        rulesToClose = steps + sumCarriedNodes(steps, true) + 1; // add carried nodes from previous chained paths
      } else if (ruleDepth === prevRuleDepth) {
        const carried: number = sumCarriedNodes(1, false);
        rulesToClose = carried + 1;
      } else {
        rulesToClose = 0;
        prevRuleNodes.push(0);
      };
      // this will prefix the jsonata line
      ruleClosureString = rulesToClose === 0 ? '' : await duplicate(')));', rulesToClose);
      // update current path
      currentFshPath = climbFshPath(currentFshPath, rulesToClose);
      // update prevRuleDepth to current value
      prevRuleDepth = ruleDepth;
      // check if rule starts with a (context) expression
      // @ts-expect-error
      const isContextStart = (substringAfter(trimmedLine, '* ')).trim().charAt(0) === '(';
      if (isContextStart) {
        const openingIndex = line.indexOf('(');
        // check if context ends on this line
        const closingIndex: number = funcs.findClosingBrackets(line, openingIndex + 1, 1);
        if (closingIndex > -1) {
          // this is a single-lined context - opens and closes on this line
          const contextPart = line.substring(openingIndex, closingIndex + 1);
          const restOfLine = line.substring(closingIndex + 1);
          // check a period comes after closing bracket
          if (restOfLine.trimStart()[0] !== '.') return thrower.throwParseError(`expected a period between the context and the path. Rule: '${line}'`);
          // @ts-expect-error
          const afterPeriod = (substringAfter(restOfLine, '.')).trim();
          // @ts-expect-error
          const pathOnly = (substringBefore(afterPeriod, '=')).trim();
          let valueOnly = (substringAfter(afterPeriod, '='));
          // when there is no assigned value, the result of valueOnly will be equal to the whole line after the period
          // @ts-expect-error
          valueOnly = valueOnly === afterPeriod ? '' : valueOnly.trim();
          const res = await constructLine(ruleClosureString, pathOnly, valueOnly, contextPart);
          return res; // `${ruleClosureString}${indent}$__flashInstance := $merge([$__flashInstance,{'${pathOnly}': ${contextPart}.($__flashInstance := {'__assignedValue': ${valueOnly}};`;
        } else {
          // no closing parenthesis - syntax error or multiline context
          // multiline context. TODO: make it work
          return thrower.throwParseError(`Expected ')' to close the context part. Rule: '${line}'`);
        }
      } else {
        // regular rule without context
        // @ts-expect-error
        const pathPart: string = (substringBefore(substringAfter(line, '* '), '=')).trim();
        // @ts-expect-error
        let valuePart: string = (substringAfter(line, '='));
        valuePart = valuePart === line ? '' : valuePart.trim();
        // trace hanging parenthesis
        const hangingBracketDiff = await funcs.calcBracketDiff(trimmedLine);
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        currentBracketDepth = currentBracketDepth + hangingBracketDiff;
        const res = await constructLine(ruleClosureString, pathPart, valuePart);
        return res;
      };
    };
    const endOfFlashBlock = funcs.findClosingBrackets(line, 0, 1);
    if (expressionHasFlash && (endOfFlashBlock >= 0 || (flashBlockHanging && index === (allLines.length - 1)))) {
      // this terminates a flash block
      const lhs = line.substring(0, endOfFlashBlock);
      const rhs = line.substring(endOfFlashBlock);
      const hangingBracketDiff: number = (await funcs.calcBracketDiff(rhs));
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      const steps: number = (prevRuleDepth / 2);
      const rulesToClose: number = steps + sumCarriedNodes(steps, true);
      let closure: string = ''; // = (await duplicate(')));', rulesToClose)) + '$__flashInstance := $__finalize($__flashInstance);';
      if (rulesToClose !== 0) {
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        closure = (await duplicate(')));', rulesToClose)) + '$__flashInstance := $__finalize($__flashInstance);';
      };
      resetVariables();
      currentBracketDepth = currentBracketDepth - hangingBracketDiff;
      let res: string;
      if (endOfFlashBlock >= 0) {
        res = `${closure}${lhs}${rhs}`;
      } else {
        res = `${line}${closure}`;
      };
      return res;
    };
    // no special handling required for this line - return it as-is
    // trace hanging parenthesis
    const hangingBracketDiff = await funcs.calcBracketDiff(trimmedLine);
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    currentBracketDepth = currentBracketDepth + hangingBracketDiff;
    return line;
  };

  const resetVariables = (): void => {
    currentFshPath = ruleClosureString = '';
    flashBlockHanging = instanceDeclerationFlag = instanceOfDeclerationFlag = false;
    // @ts-expect-error
    rootIndentOffset = rootStructDef = undefined;
    prevRuleDepth = 0;
    prevRuleNodes = [];
  };

  const climbFshPath = (path: string, steps: number): string => {
    const startPath: string = path === '' ? currentFshPath : path;
    // goes up in path <steps> levels
    if (steps === 0) return startPath; // no change
    const nodes = startPath.split('.'); // split to path nodes
    nodes.splice(nodes.length - steps, steps); // remove top levels
    const newPath = nodes.join('.'); // concatenate back into a path chain
    currentFshPath = newPath; // update currentFshPath
    return newPath;
  };

  const isLineFlashRule = async (line: string): Promise<boolean> => {
    // check if this line should be parsed as a FLASH rule
    return expressionHasFlash && // if this is false,
    //                              it couldn't be a FLASH rule since those are only
    //                              present in expressions that have FLASH scripts in them.
      flashBlockHanging && //       Even if previous condition is true, the line must
    //                              be inside a FLASH block otherwise it's probably
    //                              just a potentially valid part of a jsontata expression
      line.startsWith('*'); //      a rule line starts with an asterisk
  };

  const parseFumeExpression = async (expr: string): Promise<string> => {
    const bindings = {
      expr,
      splitLineFunc: splitToLines,
      lineParser,
      startsWith,
      endsWith
    };
    const parsed = await expressions.parseFumeExpression.evaluate({}, bindings);
    return parsed;
  };

  const sumCarriedNodes = (steps: number, climb: boolean): number => {
    if (climb) prevRuleNodes = prevRuleNodes.filter((item) => item > 0);
    if (prevRuleNodes.length === 0) return 0;
    const sum: number = prevRuleNodes.slice(-steps).reduce((acc, val) => acc + val);
    prevRuleNodes = prevRuleNodes.slice(0, prevRuleNodes.length - steps);
    return sum;
  };
  const constructLine = async (prefix: string, path: string, value?: string, context?: string, chainNode?: boolean): Promise<string> => {
    // take the parts of a flash rule and return a jsonata equivalent line

    // wrap context in parenthesis and add a period
    const contextPart = context && context !== '' ? `${context}.` : '';

    // take value into __value or create an empty object
    const valuePart = value && value !== '' ? `$__flashInstance := {'__value': ${value}}` : (value === 'undefined' ? '' : '$__flashInstance := {}');

    // split path to separate nodes
    const nodes = path.split('.');

    if (nodes.length === 1) {
      // this is a single node iteration (may still be a step in a chain)
      // add node to accumulating FSH path
      currentFshPath = `${currentFshPath}.${path}`;

      if (chainNode) { // this is an internal node in a chain of nodes (but not the last one)
        // increase node counter
        prevRuleNodes[prevRuleNodes.length - 1] += 1;
      };

      // fetch element definition
      const eDef = await getElementDefinition(rootStructDef.id, currentFshPath);
      if (eDef) {
        const eDefPath: string = eDef?.path;
        let chosenTypeEntry: object | any;
        const isPoly = eDefPath.endsWith('[x]');
        if (isPoly) {
          // it's a polymorfic element (e.g. value[x])
          // extract type name from end of path
          if (eDef?.type.length === 1) {
            // if constrained to a single type, just take it
            chosenTypeEntry = eDef?.type[0];
          } else {
            // get type from end of fsh path
            const typeByFshPath: string = path.split(eDefPath.split('.').slice(-1)[0].split('[x]')[0]).slice(-1)[0];
            const compareTypes = (typeFromDef: object | any): boolean => {
              // this function compares types by lowercasing their names
              const typeCode: string = typeFromDef?.code;
              return typeCode.toLowerCase() === typeByFshPath.toLowerCase();
            };
            // select from types using comparison function
            chosenTypeEntry = eDef?.type?.filter(compareTypes)[0];
          }
        } else {
          // not polymorphic, there can only be a single type in the array
          chosenTypeEntry = eDef?.type[0];
        };
        const baseType = chosenTypeEntry?.code;

        let kind: string;
        if (!baseType.startsWith('http://hl7.org/fhirpath/System.')) {
          // fetch StructureDefintion of type
          const typeStructDef = await getStructureDefinition(baseType);
          kind = typeStructDef?.kind;
        };

        const jsonPrimitiveProfile: string = chosenTypeEntry?.extension?.filter((ext: any) => ext?.url === 'http://hl7.org/fhir/StructureDefinition/structuredefinition-fhir-type')[0]?.valueUrl;

        const typeForFixed = jsonPrimitiveProfile ?? baseType;
        const fixed: any = eDef['fixed' + initCapOnce(typeForFixed)] ?? eDef['pattern' + initCapOnce(typeForFixed)];
        const mandatoryObj = await funcs.getMandatoriesOfElement(rootStructDef.id, eDef?.__fshPath, funcs.getMandatoriesOfStructure);

        // create cast options object
        const castOptions: CastToFhirOptions = {
          name: path,
          path: currentFshPath,
          baseType,
          // @ts-expect-error
          kind,
          jsonPrimitiveProfile,
          fixed
        };
        const mergeOptions: FlashMergeOptions = {
          key: path,
          baseMax: eDef?.base?.max ?? '1',
          max: eDef?.max ?? '1',
          // @ts-expect-error
          kind,
          mandatory: mandatoryObj
        };
        // construct line
        const line = `${prefix}$__flashInstance := $__flashMerge(${JSON.stringify(mergeOptions)},$__flashInstance,$__castToFhir(${JSON.stringify(castOptions)}, ${contextPart}(${valuePart};`;
        return line;
      };
    } else if (nodes.length > 1) {
      // chained path, iterate through each one
      prevRuleNodes.push(0);
      const bindings = {
        nodes,
        construct: constructLine,
        prefix,
        value: value ?? '',
        context: context ?? ''
      };
      const line = await expressions.constructLineIterator.evaluate({}, bindings);
      return line;
    };
    // didn't find any edef
    // @ts-expect-error
    return thrower.throwParseError(`Invalid path: '${currentFshPath}'`);
  };

  try {
    let parsed: string = await parseFumeExpression(inExpr);
    if (!expressionHasFlash) {
      res = inExpr;
    } else {
      // check if expression starts with "("
      const isEnclosed = parsed.trimStart().startsWith('(') && parsed.trimEnd().endsWith('(');
      parsed = !isEnclosed ? `(${parsed})` : parsed; // enclose in () if needed
      res = parsed;
    }
  } catch (e) {
    console.timeEnd('Parse to JSONATA');
    throw (e);
  };
  console.timeEnd('Parse to JSONATA');
  return res;
};

const toFunction = (mapping: string) => {
  return async (input: any) => {
    const res = await transform(input, mapping);
    return res;
  };
};

const compileExpression = async (expression: string): Promise<jsonata.Expression> => {
  const logger = getLogger();
  // takes a fume expression string and compiles it into a jsonata expression
  // or returns the already compiled expression from cache
  const key = hashKey(expression); // turn expression string to a key
  let compiled = cache.expressions[key]; // get from cache
  if (compiled === undefined) { // not cached
    logger.info('expression not cached, compiling it...');
    let parsedAsJsonataStr = await toJsonataString(expression);
    if (typeof parsedAsJsonataStr !== 'string') parsedAsJsonataStr = '';
    compiled = jsonata(parsedAsJsonataStr);
    cache.expressions[key] = compiled;
  };
  return compiled;
};

export const transform = async (input: any, expression: string) => {
  const logger = getLogger();
  const additionalBindings = config.getAdditionalBindings();
  try {
    const expr = await compileExpression(expression);
    let bindings: Record<string, Function | Record<string, any>> = {};

    // bind all mappings from cache
    const mappingIds = Object.keys(cache.mappings);
    if (mappingIds) {
      mappingIds.forEach((mappingId) => {
        bindings[mappingId] = cache.mappings[mappingId].function;
      });
    }

    // bind functions
    bindings.__checkResourceId = runtime.checkResourceId;
    bindings.__finalize = runtime.finalize;
    bindings.__castToFhir = runtime.castToFhir;
    bindings.__flashMerge = runtime.flashMerge;
    bindings.reference = fhirFuncs.reference;
    bindings.resourceId = fhirFuncs.resourceId;
    bindings.registerTable = fhirFuncs.registerTable;
    bindings.initCap = initCap;
    bindings.initCapSingle = initCapOnce;
    bindings.isEmpty = objectFuncs.isEmpty;
    bindings.matches = matches;
    bindings.stringify = JSON.stringify;
    bindings.selectKeys = objectFuncs.selectKeys;
    bindings.omitKeys = objectFuncs.omitKeys;
    bindings.startsWith = startsWith;
    bindings.endsWith = endsWith;
    bindings.uuid = uuid;
    bindings.translateCode = fhirFuncs.translateCode;
    bindings.translate = fhirFuncs.translateCode;
    bindings.translateCoding = fhirFuncs.translateCoding;
    bindings.search = fhirFuncs.search;
    bindings.searchSingle = fhirFuncs.searchSingle;
    bindings.literal = fhirFuncs.literal;
    bindings.resolve = fhirFuncs.resolve;
    bindings.warning = logger.warn;
    bindings.info = logger.info;
    bindings.parseCsv = parseCsv;
    bindings.v2json = v2json;
    bindings.isNumeric = isNumeric;

    // add aliases from cache, and any additional bindings
    // additonal bindings may override existing ones
    bindings = { ...cache.aliases, ...bindings, ...additionalBindings };

    const res = await expr.evaluate(input, bindings);
    return res;
  } catch (error) {
    logger.error(error);
    throw error;
  }
};

export default {
  toJsonataString,
  getSnapshot,
  getDescendantElementDef: funcs.getDescendantElementDef,
  toFunction,
  compileExpression,
  transform
};
