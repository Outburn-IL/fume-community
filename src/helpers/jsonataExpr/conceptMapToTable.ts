/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

export const conceptMapToTable = (map: any): any => {
  const cm = (map.resourceType === 'Bundle' ? [map.entry[0].resource] : [map]);

  return cm.flatMap((item, i) => {
    const codes = cm[i].group.element.map(element => element.code);
    const distinctCodes = [...new Set(codes)];

    return distinctCodes.map((code: any) => {
      const targets = cm[i].group.element.filter(element => element.code === code)
        .flatMap(element => element.target)
        .filter(target => ['equivalent', 'equal', 'wider', 'subsumes', 'relatedto'].includes(target?.equivalence))
        .map(target => ({
          code: target?.code,
          source: target?.source?.source?.source,
          target: target?.target?.source?.source
        }));

      return {
        [code]: targets
      };
    });
  });
};
