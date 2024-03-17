/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { test } from '@jest/globals';
import request from 'supertest';

import { getResourceFileContents } from '../utils/getResourceFileContents';

describe('HL7 v2 tests', () => {
  test('HL7 v2 ADT to Bundle', async () => {
    const mapping = getResourceFileContents('mappings', 'v2-adt-to-bundle.txt');
    const input = getResourceFileContents('inputs', 'HL7-v2-ADT-A01.txt');
    const requestBody = {
      input,
      contentType: 'x-application/hl7-v2+er7',
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);

    expect(res.body).toStrictEqual({
      resourceType: 'Bundle',
      id: '049fd91f-3b99-5864-9cd4-9e5480b39969',
      type: 'transaction',
      entry: [
        {
          request: {
            method: 'PUT',
            url: 'Patient/356a192b-7913-504c-9457-4d18c28d46e6'
          },
          fullUrl: 'urn:uuid:e8b15d81-264c-51a3-8c79-b01d2bc387bd',
          resource: {
            resourceType: 'Patient',
            id: '356a192b-7913-504c-9457-4d18c28d46e6',
            meta: {
              source: 'urn:uuid:d6b56e78-f6d1-4c82-9a9c-7e777a93e1af'
            },
            identifier: [
              {
                type: {
                  coding: [
                    {
                      system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                      code: 'MR'
                    }
                  ]
                },
                system: 'http://example.com/identifier/patient-id',
                value: '1'
              }
            ],
            active: true,
            name: [
              {
                family: 'DemoTest1',
                given: [
                  'DemoTest1'
                ]
              }
            ],
            telecom: [
              {
                system: 'phone',
                value: '09-12345678',
                use: 'home'
              },
              {
                system: 'phone',
                value: '054-123456789',
                use: 'mobile'
              }
            ],
            gender: 'female',
            birthDate: '2022-01-01',
            address: [
              {
                line: [
                  'Oren Street'
                ],
                city: 'Haifa',
                country: 'IL'
              }
            ]
          }
        },
        {
          request: {
            method: 'PUT',
            url: 'Account/5e683a84-b61b-587a-87c4-ac12c52f4adc'
          },
          fullUrl: 'urn:uuid:bfea352e-2473-5514-8d94-cd5d7893e4b3',
          resource: {
            resourceType: 'Account',
            id: '5e683a84-b61b-587a-87c4-ac12c52f4adc',
            meta: {
              source: 'urn:uuid:d6b56e78-f6d1-4c82-9a9c-7e777a93e1af'
            },
            identifier: [
              {
                value: 'Account1'
              }
            ],
            status: 'active',
            subject: [
              {
                reference: 'urn:uuid:e8b15d81-264c-51a3-8c79-b01d2bc387bd'
              }
            ],
            coverage: [
              {
                coverage: {
                  reference: 'urn:uuid:b3ec93b8-0bde-5fbf-b54d-1c13d03b481c'
                }
              }
            ]
          }
        },
        {
          request: {
            method: 'PUT',
            url: 'Encounter/a202b052-7dbf-51f6-a269-7ece3d07b903'
          },
          fullUrl: 'urn:uuid:f3d10c95-e080-5b91-baf7-b52189b30965',
          resource: {
            resourceType: 'Encounter',
            id: 'a202b052-7dbf-51f6-a269-7ece3d07b903',
            meta: {
              source: 'urn:uuid:d6b56e78-f6d1-4c82-9a9c-7e777a93e1af'
            },
            identifier: [
              {
                system: 'http://DemoHospital.com/identifier/admission',
                value: 'Admission1'
              }
            ],
            status: 'in-progress',
            class: {
              system: 'http://terminology.outburn.co.il/enc-class',
              code: 'E',
              display: 'emergency'
            },
            type: [
              {
                coding: [
                  {
                    system: 'http://terminology.outburn.co.il/123',
                    code: 'E'
                  }
                ]
              }
            ],
            serviceType: {
              coding: [
                {
                  code: 'MED',
                  display: 'Medical service'
                }
              ],
              text: 'Medical service'
            },
            subject: {
              reference: 'urn:uuid:e8b15d81-264c-51a3-8c79-b01d2bc387bd'
            },
            period: {
              start: '2005-01-10'
            },
            account: [
              {
                reference: 'urn:uuid:bfea352e-2473-5514-8d94-cd5d7893e4b3'
              }
            ],
            hospitalization: {
              admitSource: {
                coding: [
                  {
                    system: 'http://terminology.fume.health/admit-source',
                    code: '7'
                  }
                ]
              }
            },
            location: [
              {
                location: {
                  identifier: {
                    system: 'http://DemoHospital.com/identifier/location',
                    value: 'ER'
                  }
                },
                status: 'active'
              }
            ]
          }
        },
        {
          request: {
            method: 'PUT',
            url: 'Condition/2029de8a-c596-568d-8966-fd095f5421a1'
          },
          fullUrl: 'urn:uuid:b0e70524-6171-5e61-8850-f0218e2aa687',
          resource: {
            resourceType: 'Condition',
            id: '2029de8a-c596-568d-8966-fd095f5421a1',
            meta: {
              source: 'urn:uuid:d6b56e78-f6d1-4c82-9a9c-7e777a93e1af'
            },
            identifier: [
              {
                system: 'http://DemoHospital.com/identifier/condition',
                value: 'Condition1'
              }
            ],
            verificationStatus: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                  code: 'unconfirmed'
                }
              ]
            },
            code: {
              coding: [
                {
                  system: 'http//DemoHospital.com/cs/condition-code',
                  code: 'ABDPAIN',
                  display: 'Abdominal pain'
                },
                {
                  system: 'http//terminology.fume.health/cs/condition-code',
                  code: 'ABDPAIN',
                  display: 'Abdominal pain'
                }
              ],
              text: 'Abdominal Pain'
            },
            subject: {
              reference: 'urn:uuid:e8b15d81-264c-51a3-8c79-b01d2bc387bd'
            },
            encounter: {
              reference: 'urn:uuid:f3d10c95-e080-5b91-baf7-b52189b30965'
            },
            onsetDateTime: '2023-04-06',
            recordedDate: '2023-04-06'
          }
        },
        {
          request: {
            method: 'PUT',
            url: 'Organization/b1d57811-11d8-5f7b-bfe4-5a0852e59758'
          },
          fullUrl: 'urn:uuid:bc088c1b-a76c-5726-b9b8-303a96d5255a',
          resource: {
            resourceType: 'Organization',
            id: 'b1d57811-11d8-5f7b-bfe4-5a0852e59758',
            meta: {
              source: 'urn:uuid:d6b56e78-f6d1-4c82-9a9c-7e777a93e1af'
            },
            identifier: [
              {
                system: 'http://insurance-providers/idnetifier/insurance',
                value: '10'
              }
            ],
            name: 'Health Insurance Global',
            address: [
              {
                line: [
                  'PO BOX 94776'
                ],
                city: 'HOLLYWOOD',
                state: 'CA',
                postalCode: '999990000'
              }
            ]
          }
        },
        {
          request: {
            method: 'PUT',
            url: 'Coverage/3cdf996f-3ea0-5a0c-ad34-c695b523efa8'
          },
          fullUrl: 'urn:uuid:b3ec93b8-0bde-5fbf-b54d-1c13d03b481c',
          resource: {
            resourceType: 'Coverage',
            id: '3cdf996f-3ea0-5a0c-ad34-c695b523efa8',
            meta: {
              source: 'urn:uuid:d6b56e78-f6d1-4c82-9a9c-7e777a93e1af'
            },
            identifier: [
              {
                system: 'http://healthinsglobal.com/identifier/healthcoverage',
                value: 'InsuranceIdentifier1'
              }
            ],
            status: 'active',
            type: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/coverage-selfpay',
                  code: 'EHCPOL'
                }
              ]
            },
            beneficiary: {
              reference: 'urn:uuid:e8b15d81-264c-51a3-8c79-b01d2bc387bd'
            },
            payor: [
              {
                reference: 'urn:uuid:bc088c1b-a76c-5726-b9b8-303a96d5255a'
              }
            ]
          }
        }
      ]
    });
  });

  test('HL7 v2 ORU message parsing to JSON', async () => {
    const input = getResourceFileContents('inputs', 'HL7-v2-ORU.txt');
    const requestBody = {
      input,
      contentType: 'x-application/hl7-v2+er7',
      fume: '$'
    };

    const res = await request(globalThis.app).post('/').send(requestBody);

    expect(res.body).toStrictEqual({
      MSH: {
        SegmentDescription: 'Message Header',
        FieldSeparator: '|',
        EncodingCharacters: '^~\\&',
        SendingApplication: {
          NamespaceID: 'VitalSignsDevice'
        },
        SendingFacility: {
          NamespaceID: 'Hospital1'
        },
        ReceivingApplication: {
          NamespaceID: 'IRIS'
        },
        DateTimeOfMessage: {
          Time: '2023-04-05T20:45'
        },
        MessageType: {
          MessageCode: 'ORU',
          TriggerEvent: 'R01'
        },
        MessageControlID: '0c810ec6-c06a-4505-88b5-73841470b9d1',
        ProcessingID: {
          ProcessingID: 'P'
        },
        VersionID: {
          VersionID: '2.5.1'
        }
      },
      PID: {
        SegmentDescription: 'Patient Identification',
        SetID: '58705',
        PatientID: {
          IDNumber: '58705'
        },
        PatientIdentifierList: {
          IDNumber: '1',
          IdentifierTypeCode: 'MR'
        },
        PatientName: {
          FamilyName: {
            Surname: 'DemoTest1'
          },
          GivenName: 'DemoTest1'
        },
        DateTimeOfBirth: {
          Time: '2022-01-01'
        },
        AdministrativeSex: 'F',
        PatientAddress: {
          StreetAddress: {
            StreetOrMailingAddress: 'Oren Street'
          },
          City: 'Haifa'
        },
        CountyCode: 'IL',
        PhoneNumber_Home: {
          TelephoneNumber: '09-12345678'
        },
        PhoneNumber_Business: {
          TelephoneNumber: '054-123456789'
        },
        PatientAccountNumber: {
          IDNumber: 'Account1'
        }
      },
      PV1: {
        SegmentDescription: 'Patient Visit',
        PatientClass: '1',
        AssignedPatientLocation: {
          PointOfCare: 'CE'
        },
        AttendingDoctor: {
          IDNumber: '12345',
          FamilyName: {
            Surname: 'Doctor'
          },
          GivenName: 'Doctor'
        },
        VisitNumber: {
          IDNumber: 'Admission1',
          AssigningAuthority: {
            NamespaceID: 'DemoHospital'
          }
        }
      },
      OBX: [
        {
          SegmentDescription: 'Observation/Result',
          SetID: '1',
          ValueType: 'NM',
          ObservationIdentifier: {
            Identifier: '8480-6',
            Text: 'Systolic blood pressure',
            NameOfCodingSystem: 'LN'
          },
          ObservationValue: '125',
          Units: {
            Identifier: 'mm(hg)'
          },
          ReferencesRange: '100-120',
          NatureOfAbnormalTest: 'N',
          ObservationResultStatus: 'F',
          DateTimeOfTheAnalysis: {
            Time: '2023-04-05T21:50'
          }
        },
        {
          SegmentDescription: 'Observation/Result',
          SetID: '2',
          ValueType: 'NM',
          ObservationIdentifier: {
            Identifier: '8462-4',
            Text: 'Diastolic blood pressure',
            NameOfCodingSystem: 'LN'
          },
          ObservationValue: '95',
          Units: {
            Identifier: 'mm(hg)'
          },
          ReferencesRange: '60-90',
          NatureOfAbnormalTest: 'N',
          ObservationResultStatus: 'F',
          DateTimeOfTheAnalysis: {
            Time: '2023-04-05T21:50'
          }
        }
      ]
    });
  });

  test('HL7 v2 ORU message to BP profile', async () => {
    const input = getResourceFileContents('inputs', 'HL7-v2-ORU.txt');
    const fume = getResourceFileContents('mappings', 'v2-oru-to-bp.txt');
    const requestBody = {
      input,
      contentType: 'x-application/hl7-v2+er7',
      fume
    };

    const res = await request(globalThis.app).post('/').send(requestBody);

    expect(res.body).toStrictEqual({
      resourceType: 'Observation',
      meta: {
        profile: [
          'http://hl7.org/fhir/StructureDefinition/bp'
        ]
      },
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'vital-signs'
            }
          ]
        }
      ],
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '85354-9'
          }
        ]
      },
      component: [
        {
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '8480-6'
              }
            ]
          },
          valueQuantity: {
            system: 'http://unitsofmeasure.org',
            code: 'mm[Hg]',
            value: 125
          }
        },
        {
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '8462-4'
              }
            ]
          },
          valueQuantity: {
            system: 'http://unitsofmeasure.org',
            code: 'mm[Hg]',
            value: 95
          }
        }
      ],
      status: 'final',
      subject: {
        identifier: {
          value: '1'
        }
      },
      effectiveDateTime: '2023-04-05T21:50:00Z'
    });
  }, 15000);
});
