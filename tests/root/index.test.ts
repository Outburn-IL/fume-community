import { test } from '@jest/globals';
import request from 'supertest';

import { getResourceFileContents } from '../utils/getResourceFileContents';

const mockInput = {
  mrn: 'PP875023983',
  status: 'active',
  ssn: '123-45-6789',
  passport_number: '7429184766',
  passport_country: 'USA',
  first_name: 'Jessica',
  last_name: 'Rabbit',
  birth_date: '1988-06-22',
  sex: 'F',
  address: {
    city_name: 'Orlando',
    state: 'FL',
    street_name: 'Buena Vista',
    house_number: 1375,
    zip_code: '3456701',
    lat: 28.3519592,
    long: -81.417283
  },
  phones: [
    {
      type: 'HOME',
      number: '+1 (407) 8372859'
    },
    {
      type: 'CELL',
      number: '+1 (305) 9831195'
    }
  ],
  primary_doctor: {
    full_name: 'Dr. Dolittle',
    license: '1-820958'
  }
};

describe('integration tests', () => {
  test('Simple CSV parsing to JSON', async () => {
    const input = getResourceFileContents('inputs', 'simple-csv.txt');
    const requestBody = {
      input: input.toString(),
      contentType: 'text/csv',
      fume: '$'
    };

    const res = await request(globalThis.app).post('/').send(requestBody);

    expect(res.body).toStrictEqual([
      {
        field1: '1',
        field2: 'a',
        field3: 'true',
        field4: 'null'
      },
      {
        field1: '2',
        field2: 'b',
        field3: 'false'
      },
      {
        field1: '3',
        field2: 'c',
        field3: 'null',
        field4: 'null'
      },
      {
        field1: '4',
        field2: '1',
        field3: 'true',
        field4: 'a'
      }
    ]);
  });

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
    const input = getResourceFileContents('mappings', 'HL7-v2-ORU.txt');
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
    const input = getResourceFileContents('mappings', 'HL7-v2-ORU.txt');
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

  test('Basic Bundle with fullUrl and internal reference', async () => {
    const fume = getResourceFileContents('mappings', 'flash-script-basic-bundle.txt');
    const requestBody = {
      input: mockInput,
      fume
    };

    const res = await request(globalThis.app).post('/').send(requestBody);

    expect(res.body).toStrictEqual({
      resourceType: 'Bundle',
      entry: [
        {
          fullUrl: 'urn:uuid:74004cf7-9086-5f29-bbd0-8aca59814550',
          resource: {
            resourceType: 'Patient',
            id: '356a192b-7913-504c-9457-4d18c28d46e6',
            identifier: [
              {
                value: '356a192b-7913-504c-9457-4d18c28d46e6'
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
            birthDate: '1988-06-22'
          }
        },
        {
          fullUrl: 'urn:uuid:802ddc31-4422-5364-bff3-c1a9a3b1e21a',
          resource: {
            resourceType: 'Patient',
            id: '2nd',
            identifier: [
              {
                value: '2nd'
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
            generalPractitioner: [
              {
                reference: 'urn:uuid:74004cf7-9086-5f29-bbd0-8aca59814550'
              }
            ]
          }
        },
        {
          fullUrl: 'urn:uuid:6037a737-7ad4-5b40-803e-3bf43e69892b',
          resource: {
            resourceType: 'Patient',
            id: '3rd',
            identifier: [
              {
                value: '3rd'
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
            birthDate: '1988-06-22'
          }
        }
      ]
    });
  });

  test('Case 1 - Boolean false disappear from FLASH outputs', async () => {
    const mapping = `
            InstanceOf: Patient
            * active = false
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      active: false
    });
  });

  test('Case 2 - Slices with fixed values appear even if no children are set', async () => {
    const mapping = `
            InstanceOf: il-core-patient
            * identifier[il-id].value = undefined
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body.message).toBe('Transformation error: Element \'Patient.identifier[il-id].value\' has a minimum cardinality of 1, got 0 instead');
  });

  test('Case 3 - Slices with fixed values appear even if no children are set', async () => {
    const mapping = `
            InstanceOf: il-core-patient
            * (undefined).identifier[il-id].value = '1'
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      meta: {
        profile: [
          'http://fhir.health.gov.il/StructureDefinition/il-core-patient'
        ]
      }
    });
  });

  test.skip('Case 4 - Profiled FLASH with no rules doesn\'t go through finalize', async () => {
    const mapping = 'InstanceOf: bp';
    const requestBody = {
      input: mockInput,
      fume: mapping
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
          }
        }
      ]
    });
  });

  test('Case 5 - Polymorphic elements allow multiple values of different types', async () => {
    const mapping = `
            InstanceOf: Patient
            * deceasedBoolean = true
            * deceasedDateTime = '2024-02-26T08:45:16.317Z'
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      deceasedDateTime: '2024-02-26T08:45:16.317Z'
    });
  });

  test('Case 6 - Assignment of single element array values in FLASH is stringified', async () => {
    const mapping = `
            InstanceOf: Patient
            * name
              * given = ['a']
              * family = ['b']
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      name: [
        {
          given: [
            'a'
          ],
          family: 'b'
        }
      ]
    });
  });

  test('Case 7 - Allow array assignments into elements', async () => {
    const mapping = `
        InstanceOf: Patient
        * name
          * given = ['a', 'b', 'c']
          * family = ['d', 'e', 'f']
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      name: [
        {
          given: [
            'a',
            'b',
            'c'
          ],
          family: 'f'
        }
      ]
    });
  });

  test('Case 8 - Throw runtime error if mandatory element is missing', async () => {
    const mapping = `
        InstanceOf: il-core-patient
        * identifier[il-id].value = '000000018'
        * name.family = 'a'
        * gender = 'female'
        * birthDate = null
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body.message).toBe('Transformation error: Element \'Patient.birthDate\' has a minimum cardinality of 1, got 0 instead');
  });

  test('Case 9 - Automatic conversion of dateTime to date', async () => {
    const mapping = `
            InstanceOf: Patient
            * birthDate = $now()
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    const dateObject = new Date(res.body.birthDate);
    expect(!isNaN(dateObject.getTime())).toBe(true);
  });

  test('Case 10 - Array contexts produce invalid outputs in elements with max cardinality of 1', async () => {
    const mapping = `
            InstanceOf: Patient
            * ([false,true]).active = $
            * (['a','b']).managingOrganization
              * display = $
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      active: true,
      managingOrganization: {
        display: 'b'
      }
    });
  });

  test('Case 11 - Incorrect value assignment into slices with max cardinality > 1', async () => {
    const mapping = `
            InstanceOf: il-core-patient
            * identifier[enc].value = '1'
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      meta: {
        profile: [
          'http://fhir.health.gov.il/StructureDefinition/il-core-patient'
        ]
      },
      identifier: [
        {
          system: 'http://fhir.health.gov.il/identifier/encrypted-id-primary-moh',
          value: '1'
        }
      ]
    });
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

  test('Case 13 - Identifier values are numeric instead of string', async () => {
    const mapping = `
            InstanceOf: Patient
            * identifier.value = '123'
            * address.text = '321'
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual(
      {
        resourceType: 'Patient',
        identifier: [
          {
            value: '123'
          }
        ],
        address: [
          {
            text: '321'
          }
        ]
      }
    );
  });

  test('Case 14 - Assignment into slices with max cardinality of 1 fails to bring fixed values', async () => {
    const mapping = `
            InstanceOf: il-core-patient
            * identifier[il-id].value = '123'
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      meta: {
        profile: [
          'http://fhir.health.gov.il/StructureDefinition/il-core-patient'
        ]
      },
      identifier: [
        {
          system: 'http://fhir.health.gov.il/identifier/il-national-id',
          value: '123'
        }
      ]
    });
  });

  test('Case 15 - FLASH for datatype adds unwanted element', async () => {
    const mapping = `
            Instance: 'a1'
            InstanceOf: Address
            * text = '123'
            * line = 'a'
            * line = 'b'
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual({
      id: 'a1',
      text: '123',
      line: [
        'a',
        'b'
      ]
    });
  });

  test('Case 16 - Supply the full path of the element in the cardinality error', async () => {
    const mapping = `
            InstanceOf: bp
            * component[SystolicBP].valueQuantity
              * value = null
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body.message).toBe('Transformation error: Element \'Observation.component[SystolicBP].valueQuantity.value\' has a minimum cardinality of 1, got 0 instead');
  });

  test('Case 17 - Nested extension fixed object overrides assigned obj', async () => {
    const mapping = `
            InstanceOf: il-core-patient
            * extension[parentName]
              * extension[given]
                * url = 'given'
                * valueString = '1'
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      meta: {
        profile: [
          'http://fhir.health.gov.il/StructureDefinition/il-core-patient'
        ]
      },
      extension: [
        {
          extension: [
            {
              url: 'given',
              valueString: '1'
            }
          ],
          url: 'http://fhir.health.gov.il/StructureDefinition/ext-administrative-parent-name'
        }
      ]
    });
  });

  test.skip('Case 18 - Not all missing mandatory elements are catched', async () => {
    const mapping = `
            InstanceOf: il-core-patient
            * gender = 'unknown'
            * birthDate = $now()
            * name.given = 'a'
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toBe('Transformation error: Element identifier has a minimum cardinality of 1, got 0 instead');
  });

  test('Case 19 - Wrong type of [x] elements when addressing a specific type', async () => {
    const mapping = `
            InstanceOf: Observation
            * valueCodeableConcept
              * coding
                * code = 'a'
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual({
      resourceType: 'Observation',
      valueCodeableConcept: {
        coding: [
          {
            code: 'a'
          }
        ]
      }
    });
  });

  test('Case 20 - Wrong type of [x] elements when addressing a specific type', async () => {
    const mapping = `
            InstanceOf: il-core-practitioner
            * qualification
              * extension
                * url = 'http://fhir.health.gov.il/StructureDefinition/ext-qualification-practice'
                * valueCodeableConcept.text = 'a'
              * code.text = 'b'
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual({
      resourceType: 'Practitioner',
      meta: {
        profile: [
          'http://fhir.health.gov.il/StructureDefinition/il-core-practitioner'
        ]
      },
      qualification: [
        {
          extension: [
            {
              url: 'http://fhir.health.gov.il/StructureDefinition/ext-qualification-practice',
              valueCodeableConcept: {
                text: 'a'
              }
            }
          ],
          code: {
            text: 'b'
          }
        }
      ]
    });
  }, 50000);

  test('Case 21 - Wrong type of [x] elements when addressing a specific type', async () => {
    const mapping = `
            InstanceOf: Practitioner
            * extension.valueCodeableConcept.coding.code = 'a'
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual({
      resourceType: 'Practitioner',
      extension: [
        {
          valueCodeableConcept: {
            coding: [
              {
                code: 'a'
              }
            ]
          }
        }
      ]
    });
  });

  test('Case 22 - Wrong type of [x] elements when addressing a specific type', async () => {
    const mapping = `
            InstanceOf: Patient
            * extension.valueCoding.extension.valueAddress.text.extension.valueString.extension.valueDecimal = 12
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      extension: [
        {
          valueCoding: {
            extension: [
              {
                valueAddress: {
                  _text: {
                    extension: [
                      {
                        _valueString: {
                          extension: [
                            {
                              valueDecimal: 12
                            }
                          ]
                        }
                      }
                    ]
                  }
                }
              }
            ]
          }
        }
      ]
    });
  });

  test('Case 23 - Invalid formulation of fixed extension', async () => {
    const mapping = `
            InstanceOf: il-core-patient
            * name[Hebrew]
              * family = 'a'
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      meta: {
        profile: [
          'http://fhir.health.gov.il/StructureDefinition/il-core-patient'
        ]
      },
      name: [
        {
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/language',
              valueCode: 'he'
            }
          ],
          family: 'a'
        }
      ]
    });
  });

  test.skip('Case 24 - Object with array indexes as keys', async () => {
    const mapping = `
        {
            "EXPERT": [
              {
                "EXPERT_OCCUPATION_MOH_CODE": "15",
                "EXPERT_OCCUPATION_MOH": "כירורגיה אורתופדית"
              },
              {
                "EXPERT_OCCUPATION_MOH_CODE": "555",
                "EXPERT_OCCUPATION_MOH": "פנימית"
              }
            ]
        }.(
            InstanceOf: practitioner-rambam
            * (EXPERT).qualification[moh-expertise]
              * extension[practice]
                * value
                  * coding
                    * code = EXPERT_OCCUPATION_MOH_CODE
                    * display = EXPERT_OCCUPATION_MOH
          )
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual({
      resourceType: 'Practitioner',
      meta: {
        profile: [
          'http://fhir.rmc.gov.il/StructureDefinition/rambam-practitioner'
        ]
      },
      identifier: [
        {
          system: 'http://fhir.rmc.gov.il/identifier/foreign-id'
        }
      ],
      qualification: [
        {
          extension: [
            {
              url: 'http://fhir.health.gov.il/StructureDefinition/ext-qualification-practice'
            }
          ]
        },
        {
          extension: [
            {
              url: 'http://fhir.health.gov.il/StructureDefinition/ext-qualification-practice',
              valueCodeableConcept: {
                coding: [
                  {
                    code: '15',
                    display: 'כירורגיה אורתופדית'
                  }
                ]
              }
            },
            {
              url: 'http://fhir.health.gov.il/StructureDefinition/ext-qualification-practice',
              valueCodeableConcept: {
                coding: [
                  {
                    code: '555',
                    display: 'פנימית'
                  }
                ]
              }
            },
            {
              url: 'http://fhir.health.gov.il/StructureDefinition/ext-qualification-practice'
            }
          ],
          code: {
            coding: [
              {
                code: '5',
                system: 'http://fhir.health.gov.il/cs/practitioner-certificate-type-moh'
              },
              {
                code: '5',
                system: 'http://fhir.health.gov.il/cs/practitioner-certificate-type-moh',
                display: 'תעודת מומחה'
              }
            ]
          }
        }
      ]
    });
  }, 20000);

  test.skip('Case 25 - Duplication of fixed/pattern elements', async () => {
    const mapping = `
            InstanceOf: il-core-practitioner
            * qualification[moh-temp-practitioner-license].identifier.value = '1'
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual({
      resourceType: 'Practitioner',
      meta: {
        profile: [
          'http://fhir.health.gov.il/StructureDefinition/il-core-practitioner'
        ]
      },
      qualification: [
        {
          extension: [
            {
              url: 'http://fhir.health.gov.il/StructureDefinition/ext-qualification-practice'
            }
          ],
          identifier: [
            {
              system: 'http://practitioners.health.gov.il/Practitioners',
              value: '1'
            }
          ],
          code: {
            coding: [
              {
                code: '1',
                system: 'http://fhir.health.gov.il/cs/practitioner-certificate-type-moh',
                display: 'רשיון זמני'
              }
            ]
          }
        }
      ]
    });
  });

  test('Case 26 - Putting flash script in brackets - error', async () => {
    const mapping = `
            (
                $patient := (
                  InstanceOf: il-core-patient
                )
            )
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      meta: {
        profile: [
          'http://fhir.health.gov.il/StructureDefinition/il-core-patient'
        ]
      }
    });
  });

  test('Case 27 - Extension URL injected even when no specific extension is addressed', async () => {
    const mapping1 = `
            InstanceOf: il-core-patient
            * address.extension[language].valueCode = 'en'
        `;

    const mapping2 = `      
            InstanceOf: il-core-patient
            * address.extension.valueCode = 'en'
        `;

    const requestBody1 = {
      input: mockInput,
      fume: mapping1
    };

    const requestBody2 = {
      input: mockInput,
      fume: mapping2
    };

    await request(globalThis.app).post('/').send(requestBody1);
    const res = await request(globalThis.app).post('/').send(requestBody2);
    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      meta: {
        profile: [
          'http://fhir.health.gov.il/StructureDefinition/il-core-patient'
        ]
      },
      address: [
        {
          extension: [
            {
              valueCode: 'en'
            }
          ]
        }
      ]
    });
  });

  test('Case 28 - URL of extension is missing sometimes', async () => {
    const mapping = `
            InstanceOf: Patient
            * address.extension[language].value = 'en'
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      address: [
        {
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/language',
              valueCode: 'en'
            }
          ]
        }
      ]
    });
  });

  test('Case 29 - value[x] on an invented slice', async () => {
    const mapping = `
            InstanceOf: il-core-patient
            * address.extension[language].value[x] = 'en'
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      meta: {
        profile: [
          'http://fhir.health.gov.il/StructureDefinition/il-core-patient'
        ]
      },
      address: [
        {
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/language',
              valueCode: 'en'
            }
          ]
        }
      ]
    });
  });
});
