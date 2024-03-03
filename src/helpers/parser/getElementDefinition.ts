/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

/* eslint-disable @typescript-eslint/restrict-plus-operands */

import _ from 'lodash';

import { getCache } from '../cache';
import { initCapOnce, replaceColonsWithBrackets } from '../stringFunctions';
import thrower from '../thrower';
import { getCurrElement } from './getCurrElement';
import { getSnapshot } from './getSnapshot';
import { returnPathWithoutX } from './returnPathWithoutX';

export interface FshPathObject {
  originPath: string
  newPath: string
};

export const getElementDefinition = async (rootType: string, path: FshPathObject) => {
  if (typeof path === 'string') {
    path = { originPath: path, newPath: path };
  }
  const { elementDefinition } = getCache();
  // The current root type element determains the existing paths to look out path in.
  const currTypeStructureDefinition = await getSnapshot(rootType);
  // Creating a list of all the current path nodes.
  const pathNodes = path.newPath.split('.');

  // Iterating the nodes, and for each node implementing the logic. The path is being built from the begining to the end
  // for the fact that a diversion in the main path can lead to a "leaf", if we're not jumping to another Base element.
  for (let nodes = 1; nodes <= pathNodes.length; nodes++) {
    // Getting the path up to the current node (to check if it exists and then we can move on)
    let currPath = path.newPath.split('.').slice(0, nodes).join('.');
    let currElement;

    // First checking the definition cache
    const cachedElementDefinition = elementDefinition.get(rootType + '-' + currPath);
    if (cachedElementDefinition) {
      currElement = cachedElementDefinition;
    } else {
      // Checking if the current element path exists in the current sd
      currElement = getCurrElement(currTypeStructureDefinition, currPath, nodes, path.newPath.split('.'), rootType);
      if (currElement) {
        // If an element has a contentReference field, ), it will not have a type or a profile, since those are defined in the referenced target element.
        // The value of the contentReference field will be the target element’s id prefixed by ‘#’.
        if (_.get(currElement, 'contentReference')) {
          path.newPath = currElement.contentReference.split('.').slice(1).concat(path.newPath.split('.').slice(nodes)).join('.');
          return getElementDefinition(currElement.contentReference.split('.')[0].slice(1), path);
        } else {
          elementDefinition.set(rootType + '-' + currPath, currElement);
        }
      }
    }

    let baseElem;
    // Checking if the current node includes [x], and thats why we didnt find the relevant element.
    // so we need to check for all the options.
    if (!currElement && pathNodes[nodes - 1].includes('[') && !(nodes >= 2 && pathNodes[nodes - 2].includes('['))) {
      baseElem = _.cloneDeep(currTypeStructureDefinition.snapshot.element.find(e => {
        return replaceColonsWithBrackets(e.id) === String(currTypeStructureDefinition?.type) + '.' + String(currPath.split('[')[0]);
      }));

      if (baseElem) {
        // If there’s a type.profile, fetching its snapshot and adding the url to the type.
        if (_.get(baseElem, ['type', '0'])) {
          let baseElemSnapshot;
          try {
            baseElemSnapshot = await getSnapshot(pathNodes[nodes - 1].split('[')[1].split(']')[0]);

            if (baseElemSnapshot) {
              // Fixing the fsh to the element id standard if relevant. (bracets to colon)
              const preFixed = currPath;
              currPath = currPath.slice(0, -1).split('[').join(':');
              path.newPath = path.newPath.replace(preFixed, currPath);

              // Making sure we are not referencing a pointer to the element we're changing, but a deepClone of it.
              currElement = _.cloneDeep(baseElem);
              currElement.type[0].profile = [baseElemSnapshot.url];
              currElement.id = currElement.id + ':' + currPath.split(currElement.id.split('.')[currElement.id.split('.').length - 1] + ':')[1];

              elementDefinition.set(rootType + '-' + currPath, currElement);
              elementDefinition.set(currTypeStructureDefinition.url + '-' + currPath, currElement);
            }
          } catch (e) {}
        }
      }
    }

    // Checking wether to move on to the next node, to a content reference or throw an error
    if (currElement) {
      // We found the wanted element - the whole path exists.
      if (currPath === path.newPath) {
        currElement.__fromDefinition = currTypeStructureDefinition.url;
        return currElement;
      } else if (_.get(currElement, ['type', '0', 'code'], '').includes('System')) { // The path is invalid
        return thrower.throwParseError(`The element '${currPath}' does not have child elements.`);
      } else {
        // Applying the changes we made in the current fshPath in order to find it in the elements ids, before moving on to the next node.
        path.newPath = currElement.id.split('.').length > 1 ? String(currElement.id.split('.').slice(1).join('.')) + '.' + String(pathNodes.slice(nodes).join('.')) : pathNodes.slice(nodes).join('.');
      }
    } else {
      if (!baseElem && currPath.split('.').length === 1) {
        return thrower.throwParseError(`The element '${path.newPath}' was not found in '${rootType}'`);
      } else {
        const prevPath = path.newPath.split('.').slice(0, nodes - 1).join('.');
        baseElem = getCurrElement(currTypeStructureDefinition, prevPath, nodes - 1, path.newPath.split('.'), rootType);

        // Moving on to the different Root type - all paths in the current one are not relevant, but there might be in another one.
        if (_.get(baseElem, 'contentReference')) {
          path.newPath = baseElem.contentReference.split('.').slice(1).join('.');
          return getElementDefinition(baseElem.contentReference.split('.')[0].slice(1), path);
        }

        path.newPath = path.newPath.split('.').slice(nodes - 1).join('.');

        // Going to the profile type if exists.
        if (_.get(baseElem, ['type', '0', 'profile'])) {
          return getElementDefinition(baseElem.type[0].profile[0], path);
        } else {
          // Selecting the relevant type for polymorphic fields.
          if (baseElem?.type.length > 1) {
            const splittedOriginPath = path.originPath.split('.').slice(0, -1 * path.newPath.split('.').length);
            const specificType = baseElem.type.find(t => splittedOriginPath[splittedOriginPath.length - 1] === returnPathWithoutX(baseElem.id.split('.')[baseElem.id.split('.').length - 1]) + initCapOnce(t.code));
            return getElementDefinition(specificType.code, path);
          } else {
            return getElementDefinition(baseElem.type[0].code, path);
          }
        }
      }
    }
  }
};
