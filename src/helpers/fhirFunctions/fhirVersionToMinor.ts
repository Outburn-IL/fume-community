
export const fhirVersionToMinor = (fhirVersion: string) => {
  const parts = fhirVersion.split('.');
  return parts[0] + '.' + parts[1];
};
