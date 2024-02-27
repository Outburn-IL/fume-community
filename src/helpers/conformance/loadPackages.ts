
import path from 'path';
import fs from 'fs-extra';
import { fpl } from 'fhir-package-loader';
import { getLogger } from '../logger';
import axios from 'axios';
import _ from 'lodash';
import { getCachePackagesPath, getCachedPackageDirs } from './getCachePath';

export const loadPackage = async (fhirPackage: string | string[]) => {
  try {
    return await fpl(fhirPackage, {
      log: (level: string, message: string) => {
        if (level === 'error') {
          getLogger().error(`FPL ${level}: ${message}`);
        } else {
          getLogger().info(`FPL ${level}: ${message}`);
        }
      }
    });
  } catch (e) {
    getLogger().error(e);
    return null;
  }
};

export const loadPackages = async (packages: string[], mustPackages: string[], excludePackages: string[]) => {
  const pkgToExclude = excludePackages;
  // If there are packages without a vesion, retrieving it from fhir.org - creating a full list of packages to load.
  const packagesToLoad = await Promise.all(packages.filter(p => !pkgToExclude.includes(p)).map(async p => {
    if (p.split('@').length === 1) {
      try {
        const packageData = await axios.get(`https://packages.fhir.org/${p.split('@')[0]}/`);
        const latestVersion = _.get(packageData, ['data', 'dist-tags', 'latest']);
        return latestVersion ? `${p.split('@')}@${latestVersion}` : '';
      } catch (e) {
        getLogger().warn('Could not access - https://packages.fhir.org');
        return '';
      }
    } else {
      return p;
    }
  }));
  mustPackages = _.uniq(mustPackages.concat(packagesToLoad.filter(Boolean)));
  await loadPackage(packagesToLoad.filter(Boolean));

  // Retrieving the list of the directories in the .fhir directory.
  const cachePath = getCachePackagesPath();
  const dirList: string[] = getCachedPackageDirs();

  // For each directory, searching for it's package.json and getting it's dependencies for loading.
  await Promise.all(dirList.map(async p => {
    const currFilePath = path.join(cachePath, p, 'package\\package.json');
    let currPackageFile;
    try {
      // Reading the file.
      currPackageFile = await fs.readFile(currFilePath, 'utf8');
    } catch (error) {
      // If the package is a necessary one, and the reading fails - trying again.
      if (mustPackages.includes(p)) {
        await loadPackage([p]);
        currPackageFile = await fs.readFile(currFilePath, 'utf8');
      } else {
        return;
      }
    }

    try {
      currPackageFile = JSON.parse(currPackageFile);
      // If there are dependencies, and they haven't been loaded yet - load them.
      if (_.get(currPackageFile, 'dependencies')) {
        let currDependencies = Object.entries(_.get(currPackageFile, 'dependencies')).map(([key, value]) => {
          if (!dirList.find(d => d.includes(key))) {
            if (typeof value === 'string') return `${key}@${value}`;
            return key;
          } else {
            return '';
          }
        });

        if (currDependencies.filter(Boolean).length) {
          currDependencies = currDependencies.filter(p => !pkgToExclude.includes(p));
          mustPackages = _.uniq(mustPackages.concat(currDependencies.filter(Boolean)));
          await loadPackage(currDependencies.filter(Boolean));

          // For every dependency, load its dependencies :)
          await loadPackages(currDependencies.filter(Boolean), mustPackages, excludePackages);
        }
      }
    } catch (error) {}
  }));
};
