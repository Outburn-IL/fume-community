import { fhirVersionToMinor } from './fhirVersionToMinor';
import { literal } from './literal';
import { reference } from './reference';
import { resolve } from './resolve';
import { resourceId } from './resourceId';
import { search } from './search';
import { searchSingle } from './searchSingle';
import { translateCode } from './translateCode';
import { translateCoding } from './translateCoding';

export default {
  literal,
  resourceId,
  resolve,
  search,
  searchSingle,
  translateCoding,
  translateCode,
  fhirVersionToMinor,
  reference
};
