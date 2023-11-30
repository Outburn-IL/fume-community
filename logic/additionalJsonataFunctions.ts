import conformance from "../engine/conformance";
import cache from "./cache";
import config from "./config";
import throwErrors from "./throwErrors";
import jsonata from 'jsonata';
import parser from "../engine/parser";
import { hashKey } from "../engine/stringFunctions";

const registerTable = async (tableId: string) => {
  if (config.isStatelessMode()) {
    return throwErrors.throwRuntimeError('FUME running in stateless mode. Cannot perform $registerTable()');
  };
  const map = (await conformance.getTable(tableId))[tableId];
  cache.tables[tableId] = map;
  if (cache.tables[tableId] === undefined) {
    return 'Failed to register ConceptMap with id: "' + tableId + '"';
  } else {
    return 'ConceptMap with id "' + tableId + '" has been registered successfully';
  }
};

const compiledExpression = async (expression: string): Promise<jsonata.Expression> => {
  const logger = config.getLogger();
  // takes a fume expression string and compiles it into a jsonata expression
  // or returns the already compiled expression from cache
  const key = hashKey(expression); // turn expression string to a key
  let compiled = cache.expressions[key]; // get from cache
  if (compiled === undefined) { // not cached
    logger.info('expression not cached, compiling it...');
    let parsedAsJsonataStr = await parser.toJsonataString(expression);
    if (typeof parsedAsJsonataStr !== 'string') parsedAsJsonataStr = '';
    compiled = jsonata(parsedAsJsonataStr);
    cache.expressions[key] = compiled;
  };
  return compiled;
};

const getMinorFhirVersion = () => {
  return config.getFhirVersionWithoutPatch();
}

export default {
  registerTable,
  compiledExpression,
  getMinorFhirVersion
};