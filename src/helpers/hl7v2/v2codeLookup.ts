/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import HL7Dictionary from 'hl7-dictionary';

export const v2codeLookup = (table: number, code: string) => {
  // fork: ent.
  return HL7Dictionary.tables[table.toString()].values[code];
};
