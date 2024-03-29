/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import HL7Dictionary from 'hl7-dictionary';

export const v2tableUrl = (table: number) => {
  // fork: ent.
  const tableDef = HL7Dictionary.tables[table.toString()];
  if (tableDef === undefined) {
    return undefined;
  } else {
    const url = 'http://terminology.hl7.org/CodeSystem/v2-' + String(table).padStart(4, '0');
    return url;
  };
};
