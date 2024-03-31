/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import fs from 'fs';
import path from 'path';

import { omitKeys } from '../objectFunctions';

const packageReplace = (pkg) => pkg.replace('#', '@');

export const createRawPackageIndexObject = (packageIndexArray: any): any => {
  const packages = packageIndexArray.map(async (pkg) => omitKeys(pkg, ['package', 'packageIndex']));

  const files = packageIndexArray.flatMap((pkg) =>
    pkg.packageIndex.files.filter(
      (file) =>
        ['StructureDefinition', 'ValueSet', 'CodeSystem', 'ConceptMap'].includes(file.resourceType)
    ).map((file) => {
      const fullPath = path.join(pkg.path, file.filename);
      const actualFile = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const fhirVersion = actualFile.fhirVersion || pkg.packageManifest.fhirVersions || pkg.packageManifest['fhir-version-list'];
      const resourceName = typeof actualFile.name === 'string' ? actualFile.name : undefined;

      return {
        packageId: packageReplace(pkg.package),
        packageName: pkg.packageManifest.name,
        packageVersion: pkg.packageManifest.version,
        filename: file.filename,
        path: fullPath,
        fhirVersion,
        resourceType: file.resourceType,
        id: file.id,
        url: file.url,
        name: resourceName,
        version: file.version,
        kind: file.kind,
        type: file.type,
        baseDefinition: actualFile.baseDefinition,
        derivation: actualFile.derivation,
        date: actualFile.date
      };
    })
  );

  const structureDefinitions = files.filter((file) => file.resourceType === 'StructureDefinition');
  const valueSets = files.filter((file) => file.resourceType === 'ValueSet');
  const codeSystems = files.filter((file) => file.resourceType === 'CodeSystem');
  const conceptMaps = files.filter((file) => file.resourceType === 'ConceptMap');

  const fhirVersions = [...new Set(files.map((file) => file ? file.fhirVersion : undefined))];

  const minorVersions = [...new Set(fhirVersions.map((version: any) => version ? `${version.split('.')[0]}.${version.split('.')[1]}` : undefined))];

  return minorVersions.map((mv) => {
    const filteredFiles = files.filter((file) => `${file.fhirVersion.split('.')[0]}.${file.fhirVersion.split('.')[1] === mv}`);

    return {
      packages,
      files: filteredFiles,
      structureDefinitions: {
        byUrl: structureDefinitions.filter((def) => `${def.fhirVersion.split('.')[0]}.${def.fhirVersion.split('.')[1]}` === mv)
          .reduce((acc, curr) => ({ ...acc, [curr.url]: curr.path, [`${curr.url}|${curr.version}`]: curr.path }), {}),
        byId: structureDefinitions.filter((def) => `${def.fhirVersion.split('.')[0]}.${def.fhirVersion.split('.')[1]}` === mv)
          .reduce((acc, curr) => ({ ...acc, [curr.id]: curr.path, [`${curr.id}|${curr.version}`]: curr.path }), {}),
        byName: structureDefinitions.filter((def) => `${def.fhirVersion.split('.')[0]}.${def.fhirVersion.split('.')[1]}` === mv)
          .reduce((acc, curr) => ({ ...acc, [curr.name]: curr.path, [`${curr.name}|${curr.version}`]: curr.path }), {})
      },
      codeSystems: {
        byUrl: codeSystems.filter((cs) => `${cs.fhirVersion.split('.')[0]}.${cs.fhirVersion.split('.')[1]}` === mv)
          .reduce((acc, curr) => ({ ...acc, [curr.url]: curr.path, [`${curr.url}|${curr.version}`]: curr.path }), {}),
        byId: codeSystems.filter((cs) => `${cs.fhirVersion.split('.')[0]}.${cs.fhirVersion.split('.')[1]}` === mv)
          .reduce((acc, curr) => ({ ...acc, [curr.id]: curr.path, [`${curr.id}|${curr.version}`]: curr.path }), {}),
        byName: codeSystems.filter((cs) => `${cs.fhirVersion.split('.')[0]}.${cs.fhirVersion.split('.')[1]}` === mv)
          .reduce((acc, curr) => ({ ...acc, [curr.name]: curr.path, [`${curr.name}|${curr.version}`]: curr.path }), {})
      },
      valueSets: {
        byUrl: valueSets.filter((vs) => `${vs.fhirVersion.split('.')[0]}.${vs.fhirVersion.split('.')[1]}` === mv)
          .reduce((acc, curr) => ({ ...acc, [curr.url]: curr.path, [`${curr.url}|${curr.version}`]: curr.path }), {}),
        byId: valueSets.filter((vs) => `${vs.fhirVersion.split('.')[0]}.${vs.fhirVersion.split('.')[1]}` === mv)
          .reduce((acc, curr) => ({ ...acc, [curr.id]: curr.path, [`${curr.id}|${curr.version}`]: curr.path }), {}),
        byName: valueSets.filter((vs) => `${vs.fhirVersion.split('.')[0]}.${vs.fhirVersion.split('.')[1]}` === mv)
          .reduce((acc, curr) => ({ ...acc, [curr.name]: curr.path, [`${curr.name}|${curr.version}`]: curr.path }), {})
      },
      conceptMaps: {
        byUrl: conceptMaps.filter((cm) => `${cm.fhirVersion.split('.')[0]}.${cm.fhirVersion.split('.')[1]}` === mv)
          .reduce((acc, curr) => ({ ...acc, [curr.url]: curr.path, [`${curr.url}|${curr.version}`]: curr.path }), {}),
        byId: conceptMaps.filter((cm) => `${cm.fhirVersion.split('.')[0]}.${cm.fhirVersion.split('.')[1]}` === mv)
          .reduce((acc, curr) => ({ ...acc, [curr.id]: curr.path, [`${curr.id}|${curr.version}`]: curr.path }), {}),
        byName: conceptMaps.filter((cm) => `${cm.fhirVersion.split('.')[0]}.${cm.fhirVersion.split('.')[1]}` === mv)
          .reduce((acc, curr) => ({ ...acc, [curr.name]: curr.path, [`${curr.name}|${curr.version}`]: curr.path }), {})
      }
    };
  });
};
