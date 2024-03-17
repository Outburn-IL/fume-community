/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import HL7Dictionary from 'hl7-dictionary';

export const getV2DatatypeDef = (datatype: string, v2version: string) => {
  return HL7Dictionary.definitions[v2version].fields[datatype];
};
