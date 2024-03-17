/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import axios from 'axios';

import { LOCAL_FHIR_API } from '../config';
import { getResourceFileContents } from './getResourceFileContents';

export async function getAllConcepts () {
  const response = await axios.get(`${LOCAL_FHIR_API}/ConceptMap`);
  return response.data;
}

export async function deleteAllConcepts () {
  const concepts = await getAllConcepts();
  const entries = concepts.entry || [];
  for (const concept of entries) {
    const id = concept.resource.id;
    console.log(`deleting concept ${id}`);
    await deleteConcept(id);
  }
}

export async function addConcept (conceptFileName: string, id?: string) {
  const conceptMap = getResourceFileContents('json', conceptFileName);
  const parsed = JSON.parse(conceptMap);

  if (id) {
    const putResponse = await axios.put(`${LOCAL_FHIR_API}/ConceptMap/${id}`, parsed);
    return putResponse.data.id;
  } else {
    const postResponse = await axios.post(`${LOCAL_FHIR_API}/ConceptMap`, parsed);
    return postResponse.data.id;
  }
}

export async function deleteConcept (conceptMapId: string) {
  if (conceptMapId) {
    await axios.delete(`${LOCAL_FHIR_API}/ConceptMap/${conceptMapId}`);
  }
}

export async function addPractitioner (entityFileName: string, id: string) {
  const entity = getResourceFileContents('json', entityFileName);
  const parsedPractitioner = JSON.parse(entity);
  return await axios.put(`${LOCAL_FHIR_API}/Practitioner/${id}`, parsedPractitioner);
}

export async function deletePractitioner (id: string) {
  return await axios.delete(`${LOCAL_FHIR_API}/Practitioner/${id}`);
}
