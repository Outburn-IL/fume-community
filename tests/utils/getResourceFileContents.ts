/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import fs from 'fs';
import path from 'path';

export function getResourceFileContents (folder: string, name: string): string {
  const fileName = path.join(__dirname, '..', 'fhir', folder, name);
  return fs.readFileSync(fileName).toString();
}
