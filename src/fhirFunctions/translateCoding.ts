
import cache from "../cache";
import expressions from "../jsonataExpression";
import config from "../config";

const logger = config.getLogger();

export const translateCoding = async (input, tableId) => {
  // fork: os
  try {
    const map = cache.tables[tableId];
    const mapFiltered = map[input];
    let result;

    if (mapFiltered) {
      if (mapFiltered.length === 1) {
        result = mapFiltered[0];
      } else {
        result = mapFiltered;
      }
    }

    const coding = await expressions.translateCodingExtract.evaluate({}, { result, input });
    return coding;
  } catch (error) {
    logger.error({ error });
    return undefined;
  }
};
