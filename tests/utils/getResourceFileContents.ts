import fs from 'fs';
import path from 'path';

export function getResourceFileContents (folder: string, name: string): string {
  const fileName = path.join(__dirname, '..', 'fhir', folder, name);
  return fs.readFileSync(fileName).toString();
}
