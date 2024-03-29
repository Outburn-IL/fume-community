/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
export const fhirVersionToMinor = (fhirVersion: string) => {
  const parts = fhirVersion.split('.');
  return parts[0] + '.' + parts[1];
};
