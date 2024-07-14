/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { getLogger } from '../logger';
import { parseCsv } from './csvToJson';
import { v2json } from './hl7v2';
import { parseXml } from './xml';

export { parseCsv };

export const convertInputToJson = async (input, contentType) => {
  if (!contentType || contentType === '') {
    getLogger().info('Content-Type is empty - defaulting to \'application/json\'');
    contentType = 'application/json';
  }

  let inputJson;
  if (contentType.startsWith('x-application/hl7-v2+er7')) {
    getLogger().info('Content-Type suggests HL7 V2.x message');
    getLogger().info('Trying to parse V2 message as JSON...');
    inputJson = await v2json(input);
    getLogger().info('Parsed V2 message');
  } else if (contentType.startsWith('text/csv')) {
    getLogger().info('Content-Type suggests CSV input');
    getLogger().info('Trying to parse CSV to JSON...');
    inputJson = await parseCsv(input);
    getLogger().info('Parsed CSV to JSON');
  } else if (contentType.startsWith('application/xml')) {
    getLogger().info('Content-Type suggests XML input');
    getLogger().info('Trying to parse XML to JSON...');
    inputJson = parseXml(input);
    getLogger().info('Parsed XML to JSON');
  } else if (contentType.startsWith('application/json')) {
    getLogger().info('Content-Type suggests JSON input');
    inputJson = input;
  } else {
    throw new Error(`Unsupported Content-Type: '${contentType}'`);
  }

  return inputJson;
};
