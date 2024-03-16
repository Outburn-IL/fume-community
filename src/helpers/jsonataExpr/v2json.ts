/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import HL7Dictionary from 'hl7-dictionary';
import _ from 'lodash';

import { getV2DatatypeDef } from '../hl7v2/getV2DatatypeDef';
import { v2parse } from '../hl7v2/v2parse';
import { v2normalizeKey } from './v2normalizeKey';

export const v2json = (rawString: string): string => {
  const rawJson: any = v2parse(rawString);
  const v2version: any = rawJson?.segments[0][12];

  const getV2SegmentDef = (segmentId: string, v2version: string) => {
    const segDef = HL7Dictionary.definitions[v2version].segments[segmentId];
    return { segmentId, ...segDef };
  };

  const dtToIso = (dt) => {
    const y = dt.substring(0, 4);
    const m = dt.substring(4, 6);
    const d = dt.substring(6, 8);
    return `${y}-${m}-${d}`;
  };

  const dtmToIso = (dtm) => {
    const dt = dtToIso(dtm);
    const hh = dtm.substring(8, 10);
    const mm = dtm.substring(10, 12);
    const ss = dtm.substring(12, 14);
    const tm = `${hh !== '' ? hh : '00'}:${mm !== '' ? mm : '00'}:${ss !== '' ? ss : '00'}`;
    return `${dt}${tm !== '00:00:00' ? 'T' + tm : ''}`;
  };

  const parseValue = (value, datatype) => {
    if (value === '') {
      return undefined;
    } else {
      return datatype === 'DT' ? dtToIso(value) : (datatype === 'DTM' ? dtmToIso(value) : value);
    }
  };

  const translateSubfield = (subfield, datatypeDef, sfi) => {
    const subfieldDef = datatypeDef.subfields[sfi];
    const subfieldDesc = subfieldDef.desc;
    const subfieldDatatype = subfieldDef.datatype;
    const sfDataTypeDef = getV2DatatypeDef(subfieldDatatype, v2version);
    const isComplex = sfDataTypeDef.subfields.length > 0;
    const hasChildren = subfield.fields.length > 0;

    let value;
    if (!isComplex) {
      value = parseValue(subfield.value, subfieldDatatype);
    } else {
      if (hasChildren) {
        value = subfield.fields.map(subsubfield => translateSubfield(subsubfield, sfDataTypeDef, sfi))
          .reduce((acc, curr) => ({ ...acc, [v2normalizeKey(curr.name)]: curr.value }), {});
      } else {
        value = translateSubfield({ value: subfield.value }, sfDataTypeDef, 0);
      }
    }

    return {
      name: subfieldDesc,
      value: !_.isEmpty(value) ? value : undefined
    };
  };

  function translateField (field, segDef, fieldIndex) {
    const fieldDef = segDef.fields[fieldIndex];
    let fieldDesc = fieldDef.desc;
    fieldDesc = typeof fieldDesc === 'string' && fieldDesc.startsWith('Set ID - ') && fieldIndex === 0 ? 'SetID' : fieldDesc;
    const fieldDatatype = fieldDef.datatype;
    const datatypeDef = getV2DatatypeDef(fieldDatatype, v2version);
    const isEnc = segDef.segmentId === 'MSH' && fieldIndex === 1;
    const isComplex = datatypeDef.subfields.length > 0;
    const hasChildren = field.fields.length > 0;

    let value;
    if (isEnc) {
      value = field.value;
    } else {
      if (!isComplex) {
        value = parseValue(field.value, fieldDatatype);
      } else {
        if (hasChildren) {
          value = field.fields.map(subfield => translateSubfield(subfield, datatypeDef, 0))
            .reduce((acc, curr) => ({ ...acc, [v2normalizeKey(curr.name)]: curr.value }), {});
        } else {
          value = translateSubfield({ value: field.value }, datatypeDef, 0);
        }
      }
    }
    value = !_.isEmpty(value) ? value : undefined;

    return {
      name: fieldDesc,
      value
    };
  }

  function translateSegment (segment) {
    const segId = segment[0];
    const segDef = getV2SegmentDef(segId, v2version);
    return segment.slice(1).map((field, fieldIndex) => translateField(field, segDef, fieldIndex))
      .reduce((acc, curr) => ({ ...acc, [v2normalizeKey(curr.name)]: curr.value, SegmentDescription: segDef.desc }), {});
  }

  return rawJson.segments.map(translateSegment);
};
