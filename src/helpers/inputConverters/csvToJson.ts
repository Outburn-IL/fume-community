/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import csvToJson from 'csvtojson';

export const parseCsv = async (csv: string) => {
  let json = {};
  try {
    json = await csvToJson().fromString(csv);
  } catch (e) {
    json = [];
  }
  return json;
};
