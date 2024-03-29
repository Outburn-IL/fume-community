/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import hl7js from 'hl7js';

import thrower from '../thrower';

const v2reader = new hl7js.Reader('BASIC');

// eslint-disable-next-line @typescript-eslint/promise-function-async
export const v2parse = async (msg: string): Promise<object> => {
  // parses hl7 v2 to raw json (without field names, only numbers)
  msg = msg.replace(/(?:\r\n|\r|\n)/g, '\r\n');

  return await new Promise<object>(resolve => {
    v2reader.read(msg, function (err, hl7Data) {
      if (err) {
        return thrower.throwRuntimeError(JSON.stringify(err));
      };
      return resolve(hl7Data);
    });
  });
};
