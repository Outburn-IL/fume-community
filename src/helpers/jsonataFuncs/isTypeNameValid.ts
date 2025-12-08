/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

// makes sure the "InstanceOf" decleration contains a (fixed) potential FHIR type and not an expression
export const isTypeNameValid = (typeName: string): boolean => {
  const regexWhitespace = /\s/;
  const regexUrlOrUrn = /^(http(|s):\/\/|urn:(uuid|oid):).+[^\\s]/;
  const regexDomain = /[A-Za-z0-9\\-\\.]{1,64}/;
  const regexAlphaNumeric = /[A-Za-z]([A-Za-z0-9_]){0,254}/;

  const containsWhitespace = regexWhitespace.test(typeName);
  const isMatchUrlOrUrn = regexUrlOrUrn.test(typeName);
  const isMatchDomain = regexDomain.test(typeName);
  const isMatchAlphaNumeric = regexAlphaNumeric.test(typeName);

  return !containsWhitespace && (isMatchUrlOrUrn || isMatchDomain || isMatchAlphaNumeric);
};
