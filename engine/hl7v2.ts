/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */
import params from '../logic/cache';
import hl7js from 'hl7js';
import HL7Dictionary from 'hl7-dictionary';
import stringFuncs from './stringFunctions';
import expressions from './jsonataExpression';
import thrower from '../logic/throwErrors';

const v2reader = new hl7js.Reader('BASIC');

// eslint-disable-next-line @typescript-eslint/promise-function-async
const v2parse = async (msg: string): Promise<object> => {
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

const registerV2key = (key, normalized) => {
  params.v2keyMap[key] = normalized;
};

const v2normalizeKey = async (key: string) => {
  const bindings = { initCap: stringFuncs.initCap, keyMap: params.v2keyMap, registerV2key };
  const res = await expressions.v2normalizeKey.evaluate(key, bindings);
  return res;
};

const getV2SegmentDef = (segmentId: string, v2version: string) => {
  const segDef = HL7Dictionary.definitions[v2version].segments[segmentId];
  return { segmentId, ...segDef };
};

const getV2DatatypeDef = (datatype: string, v2version: string) => {
  return HL7Dictionary.definitions[v2version].fields[datatype];
};

const v2json = async (message: string) => {
  const bindings = {
    v2parse,
    startsWith: stringFuncs.startsWith,
    normalizeKey: v2normalizeKey,
    getSegmentDef: getV2SegmentDef,
    getDatatypeDef: getV2DatatypeDef
  };
  const res = await expressions.v2json.evaluate(
    message,
    bindings
  );
  return res;
};

const v2codeLookup = (table: number, code: string) => {
  // fork: ent.
  return HL7Dictionary.tables[table.toString()].values[code];
};

const v2tableUrl = (table: number) => {
  // fork: ent.
  const tableDef = HL7Dictionary.tables[table.toString()];
  if (tableDef === undefined) {
    return undefined;
  } else {
    const url = 'http://terminology.hl7.org/CodeSystem/v2-' + String(table).padStart(4, '0');
    return url;
  };
};

export default {
  v2tableUrl,
  v2codeLookup,
  v2json,
  getV2DatatypeDef,
  v2normalizeKey,
  registerV2key,
  v2parse
};
