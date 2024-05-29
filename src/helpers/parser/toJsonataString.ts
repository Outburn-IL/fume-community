/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import expressions from '../jsonataExpression';
import { funcs } from '../jsonataFuncs';
import { getStructureDefinition } from '../jsonataFunctions';
import { CastToFhirOptions, FlashMergeOptions } from '../runtime';
import {
  duplicate,
  endsWith,
  initCapOnce,
  splitToLines,
  startsWith,
  substringAfter,
  substringBefore
} from '../stringFunctions';
import thrower from '../thrower';
import { getElementDefinition } from './getElementDefinition';
import { removeComments } from './removeComments';

export const toJsonataString = async (inExpr: string): Promise<string | undefined> => {
  console.time('Parse to JSONATA');
  let res: string | undefined;

  // decrlare FLASH block variables:
  let rootIndentOffset: string | undefined; // the padding of the first declerations in current flash block
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
      const after: string | undefined = substringAfter(trimmedLine, 'Instance:');
      // the indentation in Instance: is the root indentation
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
      const rootTypeId: string = (substringAfter(line, 'InstanceOf:') || '').trim();
      // make sure it's a potentially valid FHIR type
      if (!(await funcs.isTypeNameValid(rootTypeId))) return thrower.throwParseError(`value after "InstanceOf:" must be a valid type name, id or URL, and cannot be an expression. Found: "${rootTypeId}"`);
      // try to fetch the type's StructureDefinition resource
      rootStructDef = await getStructureDefinition(rootTypeId);
      // throw error if StructureDefinition can't be fetched
      if (rootStructDef === undefined) return thrower.throwParseError(`can't find definition of ${rootTypeId}!`);
      // currentFshPath = rootStructDef.type;
      currentFshPath = '';
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
      rootIndentOffset = indent;
      prevRuleDepth = 0;
      prevRuleNodes = [];

      // set resourceType if it's an instance of a resource or resource profile
      const resourceType = rootStructDef?.kind === 'resource' ? `'${rootStructDef?.type}'` : 'undefined';

      // set meta with profile tag if it's a resource profile
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
      // logger.info('flashBlockHanging && isRule');
      // this line is a flash rule
      if (!instanceOfDeclerationFlag) return thrower.throwParseError(`rules cannot appear before an "InstaceOf:" declaration. Rule: "${trimmedLine}"`);
      // check indentation
      //
      // root indentation (Instance & InstanceOf) is regarded as zero
      // any root rule is 2
      // when indentation is lower than previous one, need to close previous rules - depending on the diff
      // when indentation is higher than previous one it can only be by 2 spaces - no need to close previous rule
      // when indentation is the same - close previous rule
      const indent: string | undefined = substringBefore(line, '* '); // the indentation of this rule in actual spaces
      const ruleDepth: number = (indent.length - rootIndentOffset!.length) + 2; // any root rule is 2, so all rules are shifted by 2
      if (ruleDepth < 2) {
        return thrower.throwParseError(`expected indentation of at least ${rootIndentOffset!.length} spaces, got ${indent.length} instead. Rule: ${line}`);
      }
      if (ruleDepth > prevRuleDepth + 2) {
        return thrower.throwParseError(`expected indentation of max ${rootIndentOffset!.length + prevRuleDepth} spaces, got ${indent.length} instead. Rule: ${line}`);
      }
      if (ruleDepth % 2 !== 0) {
        return thrower.throwParseError(`rule indentation must be in increments of two spaces. Rule: ${line}`);
      }
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
      const isContextStart = (substringAfter(trimmedLine, '* ') || '').trim().charAt(0) === '(';
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
          const afterPeriod = (substringAfter(restOfLine, '.') || '').trim();
          const pathOnly = (substringBefore(afterPeriod, '=') || '').trim();
          let valueOnly = (substringAfter(afterPeriod, '=') || '');
          // when there is no assigned value, the result of valueOnly will be equal to the whole line after the period
          valueOnly = valueOnly === afterPeriod ? '' : valueOnly.trim();
          const res = await constructLine(ruleClosureString, pathOnly, valueOnly, contextPart);
          return res;
        } else {
          // no closing parenthesis - syntax error or multiline context
          // multiline context. TODO: make it work
          return thrower.throwParseError(`Expected ')' to close the context part. Rule: '${line}'`);
        }
      } else {
        // regular rule without context
        const pathPart: string = (substringBefore(substringAfter(line, '* ') || '', '=') || '').trim();
        let valuePart: string = (substringAfter(line, '=') || '');
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
      // logger.info({ rulesToClose, steps });
      let closure: string = ''; // = (await duplicate(')));', rulesToClose)) + '$__flashInstance := $__finalize($__flashInstance);';
      if (rulesToClose !== 0) {
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        closure = (await duplicate(')));', rulesToClose)) + '$__flashInstance := $__finalize($__flashInstance);';
      }
      // closure = closure + '$__flashInstance := $__finalize($__flashInstance);';
      // logger.info('calling resetVariable()');
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
    // logger.info({ parsed });
    return parsed;
  };

  const sumCarriedNodes = (steps: number, climb: boolean): number => {
    // hard to explain...
    // TODO: explain...
    // logger.info('sumCarriedNodes');
    if (climb) prevRuleNodes = prevRuleNodes.filter((item) => item > 0);
    if (prevRuleNodes.length === 0) return 0;
    const sum: number = prevRuleNodes.slice(-steps).reduce((acc, val) => acc + val);
    prevRuleNodes = prevRuleNodes.slice(0, prevRuleNodes.length - steps);
    return sum;
  };
  const constructLine = async (
    prefix: string,
    path: string,
    value?: string,
    context?: string,
    chainNode?: boolean
  ): Promise<string | undefined> => {
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
      currentFshPath = currentFshPath === '' ? path : `${currentFshPath}.${path}`;
      if (chainNode) { // this is an internal node in a chain of nodes (but not the last one)
        // increase node counter
        prevRuleNodes[prevRuleNodes.length - 1] += 1;
      };

      // fetch element definition
      const eDef = await getElementDefinition(rootStructDef.id, { originPath: currentFshPath, newPath: currentFshPath });
      if (eDef) {
        const eDefPath: string = eDef?.path;
        const jsonName: string = await funcs.getJsonElementName(eDef, path);
        let chosenTypeEntry: object | any;
        const isPoly = eDefPath.endsWith('[x]');
        if (isPoly) {
          // it's a polymorfic element (e.g. value[x])
          // extract type name
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

        let kind: string = '';
        if (!baseType.startsWith('http://hl7.org/fhirpath/System.')) {
          // fetch StructureDefintion of type
          const typeStructDef = await getStructureDefinition(baseType);
          kind = typeStructDef?.kind;
        };

        const jsonPrimitiveProfile: string = chosenTypeEntry?.extension?.filter((ext: any) => ext?.url === 'http://hl7.org/fhir/StructureDefinition/structuredefinition-fhir-type')[0]?.valueUrl;

        const typeForFixed = jsonPrimitiveProfile ?? baseType;
        const fixed: any = eDef['fixed' + initCapOnce(typeForFixed)] ?? eDef['pattern' + initCapOnce(typeForFixed)];

        const mandatoryObj = await funcs.getMandatoriesOfElement(rootStructDef.id, currentFshPath);
        let pathForCardinality = currentFshPath;
        if (eDefPath.split('.').length > currentFshPath.split('.').length) {
          pathForCardinality = eDefPath.split('.')[0] + '.' + currentFshPath;
        }

        // create cast options object
        const castOptions: CastToFhirOptions = {
          name: jsonName,
          path: pathForCardinality,
          baseType,
          kind,
          jsonPrimitiveProfile,
          fixed
        };

        const mergeOptions: FlashMergeOptions = {
          key: jsonName,
          baseMax: eDef?.base?.max ?? '1',
          max: eDef?.max ?? '1',
          min: eDef?.min ?? 0,
          path: pathForCardinality,
          eDefPath,
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
    return thrower.throwParseError(`Invalid path: '${currentFshPath}'`);
  };

  try {
    const withoutComments: string = removeComments(inExpr);
    let parsed: string = await parseFumeExpression(withoutComments);
    if (!expressionHasFlash) {
      res = withoutComments;
    } else {
      // check if expression starts with "("
      const isEnclosed = parsed.trimStart().startsWith('(') && parsed.trimEnd().endsWith('(');
      // parsed = parsed.includes('$__finalize') ? parsed : `${parsed}$__flashInstance := $__finalize($__flashInstance);`
      parsed = !isEnclosed ? `(${parsed})` : parsed; // enclose in () if needed
      res = parsed.includes('$__finalize') ? parsed : parsed + '~>$__finalize';
    }
  } catch (e) {
    console.timeEnd('Parse to JSONATA');
    throw (e);
  };
  console.timeEnd('Parse to JSONATA');
  return res;
};
