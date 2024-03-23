/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

export const structureMapsToMappingObject = (data: any): any => {
  const filteredResources = data.filter(item =>
    item?.resourceType === 'StructureMap' &&
    item?.status === 'active' &&
    item?.useContext.some(context =>
      context.code.system === 'http://snomed.info/sct' &&
        context.code.code === '706594005'
    ) &&
    item.useContext.some(context =>
      context.valueCodeableConcept.coding.some(coding =>
        coding.system === 'http://codes.fume.health' &&
            coding.code === 'fume'
      )
    )
  );

  return filteredResources.map(item =>
    item.group.find(group => group.name === 'fumeMapping')
      .rule.find(rule => rule.name === 'evaluate')
      .extension.find(extension => extension.url === 'http://fhir.fume.health/StructureDefinition/mapping-expression')
      .valueExpression.expression
  );
};