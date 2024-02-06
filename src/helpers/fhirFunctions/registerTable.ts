import cache from "../cache";
import config from "../../config";
import conformance from "../conformance";
import thrower from "../thrower";

export const registerTable = async (tableId: string) => {
    if (config.isStatelessMode()) {
      return thrower.throwRuntimeError('FUME running in stateless mode. Cannot perform $registerTable()');
    };
    const map = (await conformance.getTable(tableId))[tableId];
    cache.tables[tableId] = map;
    if (cache.tables[tableId] === undefined) {
      return 'Failed to register ConceptMap with id: "' + tableId + '"';
    } else {
      return 'ConceptMap with id "' + tableId + '" has been registered successfully';
    }
  };