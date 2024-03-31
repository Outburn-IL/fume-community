/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

// returns the diff between opening and closing parenthesis in  a single line
export const fixPackageIndexObject = (packageIndexObject: any): any => {
  const splitVersionId = (versionId) => {
    const parts = (versionId ?? '').split('.');
    const major = parts[0];
    const minor = parts[1];
    const patch = (parts[2] ?? '').split('-')[0];
    const label = (parts[2] ?? '').split('-')[1] || '';
    return {
      id: versionId,
      major: !isNaN(major) ? parseInt(major) : 0,
      minor: !isNaN(minor) ? parseInt(minor) : 0,
      patch: !isNaN(patch) ? parseInt(patch) : 0,
      label: isNaN(major) ? major : (label !== patch ? label : '')
    };
  };

  const splitPackageVersion = (filesEntry) => {
    return {
      ...filesEntry,
      packageVersion: splitVersionId(filesEntry?.packageVersion)
    };
  };

  const bestFileByUrl = (filePaths) => {
    const filesEntries = filePaths.map(fp => splitPackageVersion(packageIndexObject[fp]));
    const sortedEntries = filesEntries.sort((a, b) => {
      if (a?.date > b?.date) return -1;
      if (a?.date < b?.date) return 1;
      if (a?.packageName !== b?.packageName) return a?.packageName.localeCompare(b?.packageName);
      if (a?.packageVersion.major !== b?.packageVersion.major) return b?.packageVersion.major - a?.packageVersion.major;
      if (a?.packageVersion.minor !== b?.packageVersion.minor) return b?.packageVersion.minor - a?.packageVersion.minor;
      if (a?.packageVersion.patch !== b?.packageVersion.patch) return b?.packageVersion.patch - a?.packageVersion.patch;
      return a?.packageVersion.label.localeCompare(b?.packageVersion.label);
    });
    return sortedEntries[0].path;
  };

  const bestFileById = (filePaths) => {
    const urls = Array.from(new Set(filePaths.map(fp => packageIndexObject[fp].url)));
    return urls.map(url => bestFileByUrl(filePaths.filter(fp => packageIndexObject[fp].url === url)));
  };

  const bestFileByName = (filePaths) => {
    return bestFileByUrl(filePaths);
  };

  const getDuplicates = (obj) => {
    return Object.keys(obj).filter(key => Array.isArray(obj[key]));
  };

  const fixTypeByUrl = (byUrl) => {
    const dups = getDuplicates(byUrl);
    const dupsFixed = {};
    dups.forEach(url => {
      dupsFixed[url] = bestFileByUrl(dups[url]);
    });
    return { ...byUrl, ...dupsFixed };
  };

  const fixTypeById = (byId) => {
    const dups = getDuplicates(byId);
    const dupsFixed = {};
    dups.forEach(id => {
      dupsFixed[id] = bestFileById(byId[id]);
    });
    return { ...byId, ...dupsFixed };
  };

  const fixTypeByName = (byName) => {
    const dups = getDuplicates(byName);
    const dupsFixed = {};
    dups.forEach(name => {
      dupsFixed[name] = bestFileByName(byName[name]);
    });
    return { ...byName, ...dupsFixed };
  };

  const fixType = (typeObj) => {
    return {
      byUrl: fixTypeByUrl(typeObj.byUrl),
      byId: fixTypeById(typeObj.byId),
      byName: fixTypeByName(typeObj.byName)
    };
  };

  const fixVersion = (versionObj) => {
    const types = Object.keys(versionObj);
    const fixedVersion = {};
    types.forEach(type => {
      fixedVersion[type] = fixType(versionObj[type]);
    });
    return fixedVersion;
  };

  return Object.keys(packageIndexObject).filter(key => !['packages', 'files'].includes(key)).map(version => ({
    [version]: {
      packages: packageIndexObject.packages,
      files: packageIndexObject.files,
      ...fixVersion(packageIndexObject[version])
    }
  }));
};
