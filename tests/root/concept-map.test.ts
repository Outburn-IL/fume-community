/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { test } from '@jest/globals';
import request from 'supertest';

import { addConcept, addPractitioner, deleteConcept, deletePractitioner } from '../utils/fhirHelpers';
import { getResourceFileContents } from '../utils/getResourceFileContents';
import { mockInput } from '../utils/mockInput';

describe('using a concept map', () => {
  let fumeConceptMapId: string;
  let genderConceptMapId: string;

  beforeAll(async () => {
    // load concept map
    fumeConceptMapId = await addConcept('concept-fume-aliases.json');
    genderConceptMapId = await addConcept('gender.json', 'gender');
    await addPractitioner('practitioner.json', 'cc829d28-3b32-43df-af57-e72035d98e18');
    await request(globalThis.app).get('/recache');
  });

  afterAll(async () => {
    await deleteConcept(fumeConceptMapId);
    await deleteConcept(genderConceptMapId);
    await deletePractitioner('cc829d28-3b32-43df-af57-e72035d98e18');
    await request(globalThis.app).get('/recache');
  });

  test('Case 12 - aliases stopped working', async () => {
    const mapping = `
              Instance: $pid := '584afafb-c979-44bd-a821-fb232721480e'
              InstanceOf: Patient
              * identifier
                * system = $urn
                * value = 'urn:uuid:' & $pid
              * identifier
                * system = $exampleMrn
                * value = mrn
              * identifier
                * system = $ssn
                * value = ssn
              * identifier
                * system = $passportPrefix & passport_country
                * value = passport_number
          `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual(
      {
        resourceType: 'Patient',
        id: '584afafb-c979-44bd-a821-fb232721480e',
        identifier: [
          {
            system: 'urn:ietf:rfc:3986',
            value: 'urn:uuid:584afafb-c979-44bd-a821-fb232721480e'
          },
          {
            system: 'http://this.is.an.example.uri/mrn',
            value: 'PP875023983'
          },
          {
            system: 'http://hl7.org/fhir/sid/us-ssn',
            value: '123-45-6789'
          },
          {
            system: 'http://hl7.org/fhir/sid/passport-USA',
            value: '7429184766'
          }
        ]
      }
    );
  });

  test('Default example mapping from Designer', async () => {
    const fume = getResourceFileContents('mappings', 'flash-script-fhir-4.0-patient.txt');
    const requestBody = {
      input: mockInput,
      fume
    };

    const res = await request(globalThis.app).post('/').send(requestBody);

    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      id: '356a192b-7913-504c-9457-4d18c28d46e6',
      identifier: [
        {
          system: 'urn:ietf:rfc:3986',
          value: 'urn:uuid:356a192b-7913-504c-9457-4d18c28d46e6'
        },
        {
          system: 'http://this.is.an.example.uri/mrn',
          value: 'PP875023983'
        },
        {
          system: 'http://hl7.org/fhir/sid/us-ssn',
          value: '123-45-6789'
        },
        {
          system: 'http://hl7.org/fhir/sid/passport-USA',
          value: '7429184766'
        }
      ],
      active: true,
      name: [
        {
          given: [
            'Jessica'
          ],
          family: 'Rabbit'
        }
      ],
      birthDate: '1988-06-22',
      gender: 'female',
      address: [
        {
          city: 'Orlando',
          state: 'FL',
          country: 'USA',
          line: [
            '1375 Buena Vista'
          ],
          postalCode: '3456701',
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/geolocation',
              extension: [
                {
                  url: 'latitude',
                  valueDecimal: 28.3519592
                },
                {
                  url: 'longitude',
                  valueDecimal: -81.417283
                }
              ]
            }
          ]
        }
      ],
      telecom: [
        {
          system: 'phone',
          value: '+1 (407) 8372859',
          use: 'home'
        },
        {
          system: 'phone',
          value: '+1 (305) 9831195',
          use: 'mobile'
        }
      ],
      generalPractitioner: [
        {
          identifier: {
            value: '1-820958',
            type: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                  display: 'Medical License number',
                  code: 'MD'
                }
              ]
            }
          },
          display: 'Dr. Dolittle',
          reference: 'Practitioner/cc829d28-3b32-43df-af57-e72035d98e18'
        }
      ]
    });
  });
});
