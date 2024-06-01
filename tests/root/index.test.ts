/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { test } from '@jest/globals';
import request from 'supertest';

import { getResourceFileContents } from '../utils/getResourceFileContents';
import { mockInput } from '../utils/mockInput';

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
    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      meta: {
        profile: [
          'http://fhir.health.gov.il/StructureDefinition/il-core-patient'
        ]
      },
      identifier: [
        {
          system: 'http://fhir.health.gov.il/identifier/il-national-id'
        }
      ]
    });
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

  test('Case 4 - Profiled FLASH with no rules doesn\'t go through finalize', async () => {
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

  test.skip('Case 8 - Throw runtime error if mandatory element is missing', async () => {
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

  test.skip('Case 16 - Supply the full path of the element in the cardinality error', async () => {
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
