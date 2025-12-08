/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { FormatConverter } from '@outburn/format-converter';

import { getLogger } from './logger';

const formatConverter = new FormatConverter(getLogger());

// Re-export individual converters for backwards compatibility
export const parseCsv = formatConverter.csvToJson.bind(formatConverter);
export const parseXml = formatConverter.xmlToJson.bind(formatConverter);
export const v2json = formatConverter.hl7v2ToJson.bind(formatConverter);

export const convertInputToJson = async (input, contentType) => {
  if (!contentType || contentType === '') {
    getLogger().info('Content-Type is empty - defaulting to \'application/json\'');
    contentType = 'application/json';
  }

  let inputJson;
  if (contentType.startsWith('x-application/hl7-v2+er7')) {
    getLogger().info('Parsing HL7 V2.x message...');
    inputJson = await v2json(input);
  } else if (contentType.startsWith('text/csv')) {
    getLogger().info('Parsing CSV to JSON...');
    inputJson = await parseCsv(input);
  } else if (contentType.startsWith('application/xml')) {
    getLogger().info('Parsing XML to JSON...');
    inputJson = await parseXml(input);
  } else if (contentType.startsWith('application/json')) {
    getLogger().info('Using JSON input as-is');
    inputJson = input;
  } else {
    throw new Error(`Unsupported Content-Type: '${contentType}'`);
  }

  return inputJson;
};
