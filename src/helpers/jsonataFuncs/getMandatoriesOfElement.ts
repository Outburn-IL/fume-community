/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */
/* eslint-disable */

import { getSnapshot } from '../parser/getSnapshot';
import { initCap, initCapOnce, replaceColonsWithBrackets, startsWith, substringAfter, substringBefore } from '../stringFunctions';
import _ from 'lodash';
import { getElementDefinition } from '../parser/getElementDefinition';
import { getStructureDefinition } from '../jsonataFunctions';
import { getMandatoriesOfStructure } from './getMandatoriesOfStructure';

const dev = process.env.NODE_ENV === 'dev';

export const getMandatoriesOfElement = async (structId: string, relativePath: string): Promise<any> => {
  if (dev) console.log({ func: getMandatoriesOfElement, structId,relativePath });
  /* for primitives, return the primitive if it has a fixed value */
  /* for complex types, return an object containing all mandatory  */
  /* decendants that have fixed values down the chain */
  /* the element is taken from the root structure definition 'snapshot.element' array */
  const rootStruct = await getSnapshot(structId);
  const rootStructSnapshot = rootStruct.snapshot?.element;

  /* take the element definition of the requested (parent) element */
  const parentElement = await getElementDefinition(structId, relativePath);
  const fromDefinition = parentElement?.__fromDefinition;

  /* check if returned element is from the root definition */
  if (rootStruct?.url === fromDefinition) {
    /* get the fhirtype name(s) of the parent, for use in polymorphic keys */
    const parentElementType = parentElement.type.map(t => {
      if (t.code.startsWith('http://hl7.org/fhirpath/System.')) {
        return t?.extension.find(e => e?.url === 'http://hl7.org/fhir/StructureDefinition/structuredefinition-fhir-type')?.valueUrl;
      } else {
        return t?.code;
      }
    });

    /* get the profile, if set (e.g. slices on extension or il-core-patient.address) TODO */
    const parentElementProfile = parentElement?.type[0]?.profile;
    let fixed;

    /* not poly - polies cannot have fixed */
    if (parentElementType.length === 1) {
      const fixedKeys = ['fixed', 'pattern'].map(key => key + parentElementType[0].split(' ').map(w => initCapOnce(w)).join(' '));
      /* get the fixed value if there is one TODO */
      fixed = fixedKeys.map(k => _.get(parentElement, k)).filter(Boolean);
      fixed = fixed.length ? fixed[0] : undefined;
    }

    const typeOfFixed = typeof fixed;

    /* now if fixed is not object, no need to continue */
    if (fixed && typeOfFixed !== 'object') {
      return fixed;
    } else {
      /* however if it is an object, it may also have fixed values from underneath */
      /* this is obviously true also when there isn't a fixed value */
      /* take all elements with min>0 that are "under" the requested element */
      let childrenFromRootStruct = rootStructSnapshot.filter(e => {
        /* There is a fixed[x] or pattern[x] or it's just mandatory */
        return e.id.startsWith(parentElement.id + '.') &&
               !substringAfter(e.id, parentElement.id + '.')?.includes('.') && /* take only those that are a single step under */
               (Object.keys(e).filter(k => startsWith(k, 'fixed') || startsWith(k, 'pattern')).length > 0 ||
                e.min > 0);
      });
      /* add the correct json key name to each element */
      childrenFromRootStruct = childrenFromRootStruct.map(child => {
        const lastNode = child.id.split('.').slice(-1)[0];
        child.__jsonKey = lastNode.endsWith('[x]') ? substringBefore(lastNode, '[x]') + initCap(child?.type[0].code) : lastNode;
        return child;
      });
      let obj = [];
      childrenFromRootStruct = childrenFromRootStruct.map(child => {
        const code = child?.type[0]?.code;
        if (code) {
          if (startsWith(code, 'http://hl7.org/fhirpath/System.')) {
            child.__kind = 'primitive-type';
          } else {
            child.__kind = getStructureDefinition(code).kind;
          }
        }
        return child;
      });

      childrenFromRootStruct = await Promise.all(childrenFromRootStruct.map(async child => {
        const val = await getMandatoriesOfElement(structId, substringAfter(child.id, rootStructSnapshot[0].id + '.'));
        return _.merge(child, { __val: val });
      }));
      childrenFromRootStruct = childrenFromRootStruct.map(child => {
        if (typeof child.__val === 'object' && child.__kind === 'primitive-type') {
          child[`_${child.__jsonKey}`] = child[child.__jsonKey];
          delete child[child.__jsonKey];
        }

        return child;
      });

      childrenFromRootStruct = childrenFromRootStruct.map(child => {
        const lastNode = child.id.split('.').slice(-1)[0];
        const jsonKey = lastNode.endsWith('[x]')
          ? `${lastNode.split('[x]')[0]}${initCapOnce(child.type[0].code)}`
          : lastNode;
        return { ...child, __jsonKey: jsonKey };
      });

      obj = await childrenFromRootStruct.reduce((acc, curr) => {
        if (curr.__val) {
          acc[curr.__jsonKey] = (curr.base.max > '1' || curr.base.max === '*' || curr.max > '1' || curr.max === '*') ? [curr.__val] : curr.__val;
        }

        return acc;
      }, {});

      let fromProfile;

      if (parentElementProfile?.length === 1) {
        fromProfile = await getMandatoriesOfStructure(parentElementProfile[0]);
      }

      const res = _.merge(fixed, fromProfile, obj);

      if (Object.keys(res).length !== 0 && Object.keys(res).length > 0) {
        const kv = { ...res };
        const kvWithBrackets = {};
        for (const key of Object.keys(kv)) {
          if (res[key]) {
            kvWithBrackets[replaceColonsWithBrackets(key)] = kv[key];
          }
        }
        const mergedResult = Object.assign({}, kvWithBrackets);
        return mergedResult;
      }
    }
  } else {
    /* if returned element is from a different definition than the root, call this function again */
    /* this time on the element's containing definition */
    const fromDefinitionSnapshot = await getSnapshot(fromDefinition);
    const baseType = fromDefinitionSnapshot.type;
    const relativeElementId = substringAfter(parentElement.id, baseType + '.');
    return await getMandatoriesOfElement(fromDefinition, relativeElementId ?? '');
  }
};
