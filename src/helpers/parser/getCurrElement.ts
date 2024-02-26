/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

/* eslint-disable @typescript-eslint/restrict-plus-operands */

import _ from 'lodash';
import { getCache } from '../cache';
import { initCapOnce, replaceColonsWithBrackets } from '../stringFunctions';
import { returnPathWithoutX } from './returnPathWithoutX';

// Generate all the options for the next node's path, based on the optional types (value[x])
const generateNodeIdOptions = (element: any) => {
  const fshOptions: string[] = [];
  const elementId: string = returnPathWithoutX(element.id);
  const elementType = _.get(element, 'type');
  if (!elementType) {
    return [];
  } else if (elementType.length === 1) {
    fshOptions.push(elementId.split('.')[elementId.split('.').length - 1] + '[x]');
  }

  elementType.forEach(t => {
    fshOptions.push(elementId + initCapOnce(t.code));
  });
  return fshOptions;
};

/**
 * This functions looks for the current path in the current sd snapshot's elements.
 * It implements several rules:
 * 1 - Exact match: nodeName = nodeName
 * 2 - A choice type element ([x]) that’s constrained to a single type: nodeName = nodeName[x] and count(type) = 1
 * 3 - A chosen type from a choice element: nodeNameDataType = nodeName[x] and DataType in initCap(type.code), Filter result’s element.type array for: initCap(code) = DataType
 * 4 - A specific type in a sliced choice element: nodeNameDataType = nodeName[x]:nodeNameDataType
 * 5 - A slice entry: nodeName[sliceName] = nodeName:sliceName
 **/
export const getCurrElement = (currTypeStructureDefinition, currPath, nodes, pathNodes, rootType) => {
  const { elementDefinition } = getCache();
  const cachedElementDefinition = elementDefinition.get(rootType + '-' + currPath);
  if (cachedElementDefinition) {
    return cachedElementDefinition;
  } else {
    const element = currTypeStructureDefinition.snapshot.element.find(e => {
      return ((e.id === currTypeStructureDefinition?.type + '.' + currPath) ||
            (e.id === currTypeStructureDefinition?.type + '.' + currPath + '[x]' && e?.type.length === 1) ||
            (replaceColonsWithBrackets(e.id) === currTypeStructureDefinition?.type + '.' + currPath)) ||
            (e.id.split('.').length === (pathNodes.length + 1) &&
            (pathNodes[nodes - 1] === e.id.split('.').slice(1).join('.') ||
            generateNodeIdOptions(e).find(o => o === currPath) ||
            pathNodes[nodes - 1] === _.get(returnPathWithoutX(e.id.split('.').slice(1).join('.')).split('[x]:'), '1', false))) ||
            generateNodeIdOptions(e).find((o: any) => o.split('.').slice(1).join('.') === currPath);
    });

    return element;
  }
};
