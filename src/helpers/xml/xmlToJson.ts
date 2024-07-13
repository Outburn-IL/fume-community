/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { XMLParser } from 'fast-xml-parser';

const ATTRIBUTE_PREFIX = '@_';

export const parseXml = (xml: string) => {
  const json = parseXmlWithXhtmlHandling(xml);

  const values: any[] = [];
  if (Object.keys(json).length === 1) {
    const rootKey = Object.keys(json)[0];
    if (Array.isArray(json[rootKey])) {
      for (const jsonValue of json[rootKey]) {
        values.push(standardizeJson(jsonValue, rootKey));
      }
    } else {
      values.push(standardizeJson(json[rootKey], rootKey));
    }
  }

  if (Object.keys(json).length > 1) {
    for (const rootKey of Object.keys(json)) {
      values.push(standardizeJson(json[rootKey], rootKey));
    }
  }

  return values.length === 1 ? values[0] : values;
};

const parseXmlWithXhtmlHandling = (xml: string): any => {
  const options: Record<string, any> = {
    ignoreAttributes: false,
    attributeNamePrefix: ATTRIBUTE_PREFIX,
    allowBooleanAttributes: true,
    alwaysCreateTextNode: true,
    numberParseOptions: {
      leadingZeros: false,
      hex: false,
      skipLike: /\*/
    }
  };
  const firstParser = new XMLParser(options);
  const firstParsing = firstParser.parse(xml);
  const xhtmlPaths = getXhtmlPaths('', firstParsing, []);

  if (xhtmlPaths.length === 0) {
    return firstParsing;
  }

  options.stopNodes = [...new Set(xhtmlPaths)]; // remove duplications;
  const secondParser = new XMLParser(options);
  const secondParsing = secondParser.parse(xml);
  return secondParsing;
};

const getXhtmlPaths = (currentPath, currentValue, xhtmlPaths) => {
  if (Array.isArray(currentValue)) {
    for (let i = 0; i < currentValue.length; i++) {
      getXhtmlPaths(`${currentPath}`, currentValue[i], xhtmlPaths);
    }
  } else if (typeof currentValue === 'object') {
    if (currentValue[`${ATTRIBUTE_PREFIX}xmlns`] === 'http://www.w3.org/1999/xhtml') {
      xhtmlPaths.push(currentPath);
    } else {
      for (const key of Object.keys(currentValue)) {
        getXhtmlPaths(`${currentPath ? `${currentPath}.` : ''}${key}`, currentValue[key], xhtmlPaths);
      }
    }
  }
  return xhtmlPaths;
};

const standardizeJson = (json, rootKey: string): Record<string, any> => {
  const parsedXml = recursiveStandardize(json, rootKey);
  const value = parsedXml[rootKey];
  if (typeof value === 'object') {
    const namespaceIndex = rootKey.indexOf(':');
    if (namespaceIndex !== -1) {
      value._namespace = rootKey.slice(0, namespaceIndex);
      if (!value.resourceType) {
        value._xmlTagName = rootKey.slice(namespaceIndex + 1);
      }
    } else if (!value.resourceType) {
      value._xmlTagName = rootKey;
    }
  }
  return value;
};

const recursiveStandardize = (node: any, key: string) => {
  const newNode: Record<string, any | any[]> = {};
  let newKey: string = key;

  // extract values and attributes
  let textValue: any | undefined;
  const complexValue = {};
  let valueAttribute: string | undefined;
  const attributes: Record<string, any> = {};
  for (const key of Object.keys(node)) {
    if (key === '#text' && (typeof node[key] !== 'string' || node[key].length > 0)) {
      textValue = String(node[key]);
    } else if (key.startsWith(ATTRIBUTE_PREFIX)) {
      attributes[key.slice(ATTRIBUTE_PREFIX.length)] = node[key];
      if (key === `${ATTRIBUTE_PREFIX}value`) {
        valueAttribute = node[key];
      }
    } else {
      complexValue[key] = node[key];
    }
  }

  // extract namespace
  const namespaceIndex = key.indexOf(':');
  let namespaceValue;
  if (namespaceIndex !== -1) {
    newKey = key.slice(namespaceIndex + 1);
    namespaceValue = key.slice(0, namespaceIndex);
  }

  // extract complex childs
  const complexChildsObject = createComplexChildsObject(complexValue);

  // replace xmlns="http://hl7.org/fhir" with resourceType
  if (attributes.xmlns === 'http://hl7.org/fhir') {
    attributes.resourceType = newKey;
    delete attributes.xmlns;
  }

  // build new node
  if (textValue && attributes.xmlns === 'http://www.w3.org/1999/xhtml') {
    textValue = `<${key}${buildAttributesString(attributes)}>${textValue}</${key}>`;
    newNode[newKey] = textValue;
  } else if (textValue) {
    newNode[newKey] = textValue;
    addInnerKeys(newNode, `_${newKey}`, { _namespace: namespaceValue });
    addInnerKeys(newNode, `_${newKey}`, attributes);
  } else if (valueAttribute) {
    newNode[newKey] = valueAttribute;
    addInnerKeys(newNode, `_${newKey}`, { _namespace: namespaceValue });
    delete attributes.value;
    addInnerKeys(newNode, `_${newKey}`, attributes);
    addInnerKeys(newNode, `_${newKey}`, complexChildsObject);
  } else if (Object.keys(complexChildsObject).length > 0) {
    addInnerKeys(newNode, newKey, complexChildsObject);
    addInnerKeys(newNode, newKey, { _namespace: namespaceValue });
    addInnerKeys(newNode, newKey, attributes);
  } else if (Object.keys(attributes).length > 0) {
    addInnerKeys(newNode, newKey, { _namespace: namespaceValue });
    addInnerKeys(newNode, newKey, attributes);
  }
  return newNode;
};

const createComplexChildsObject = (complexChilds) => {
  const complexChildsObject = {};
  for (const childKey of Object.keys(complexChilds)) {
    if (Array.isArray(complexChilds[childKey])) {
      const childValues = complexChilds[childKey];
      for (const childValue of childValues) {
        const child = recursiveStandardize(childValue, childKey);
        addChildToParent(complexChildsObject, child);
      }
    } else {
      const child = recursiveStandardize(complexChilds[childKey], childKey);
      addChildToParent(complexChildsObject, child);
    }
  }
  return complexChildsObject;
};
// /_xmlTagName

const addChildToParent = (parentNode, child) => {
  const childKey: string | undefined = Object.keys(child).find(key => !key.startsWith('_'));
  const childAttKey: string | undefined = Object.keys(child).find(key => key.startsWith('_'));

  if (childKey === undefined && childAttKey === undefined) return;
  const key = childKey ?? childAttKey!.slice(1);
  const attKey = childAttKey ?? `_${childKey}`;

  if ((parentNode[key]) || (parentNode[attKey])) {
    const keySize = parentNode[key] ? (Array.isArray(parentNode[key]) ? parentNode[key].length : 1) : 0;
    const attKeySize = parentNode[attKey] ? (Array.isArray(parentNode[attKey]) ? parentNode[attKey].length : 1) : 0;

    if (keySize > 1) {
      parentNode[key].push(child[key] ?? null);
    } else if (keySize === 1) {
      parentNode[key] = [parentNode[key], child[key] ?? null];
    } else if (childKey) {
      parentNode[key] = Array.from({ length: attKeySize }, (x, i) => null);
      parentNode[key].push(child[key] ?? null);
    }

    if (attKeySize > 1) {
      parentNode[attKey].push(child[attKey] ?? null);
    } else if (attKeySize === 1) {
      parentNode[attKey] = [parentNode[attKey], child[attKey] ?? null];
    } else if (childAttKey) {
      parentNode[attKey] = Array.from({ length: keySize }, (x, i) => null);
      parentNode[attKey].push(child[attKey] ?? null);
    }
  } else {
    if (childKey) {
      parentNode[key] = child[key];
    }
    if (childAttKey) {
      parentNode[attKey] = child[attKey];
    }
  }
};

const addInnerKeys = (object, key, innerObject) => {
  for (const innerKey of Object.keys(innerObject)) {
    addInnerKey(object, key, innerKey, innerObject[innerKey]);
  }
};

const addInnerKey = (object, key, innerKey, innerValue) => {
  if (innerValue === undefined) return;
  if (object[key] === undefined) {
    object[key] = {};
  }

  if (innerKey === 'resourceType') {
    object[key] = {
      resourceType: innerValue,
      ...object[key]
    };
  } else {
    object[key][innerKey] = innerValue;
  }
};

const buildAttributesString = (attributs) => {
  let string = '';
  for (const key of Object.keys(attributs)) {
    string += ` ${key}="${attributs[key]}"`;
  }
  return string;
};
