import HL7Dictionary from 'hl7-dictionary';
import { v2normalizeKey } from './v2normalizeKey';
import { v2parse } from './v2parse';
import { getV2DatatypeDef } from './getV2DatatypeDef';
import { startsWith } from '../stringFunctions';
import expressions from '../jsonataExpression';

const getV2SegmentDef = (segmentId: string, v2version: string) => {
  const segDef = HL7Dictionary.definitions[v2version].segments[segmentId];
  return { segmentId, ...segDef };
};

export const v2json = async (message: string) => {
  const bindings = {
    v2parse,
    startsWith,
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
