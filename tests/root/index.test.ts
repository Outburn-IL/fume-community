import { test } from '@jest/globals';
import request from 'supertest';
import _ from 'lodash';
import fs from 'fs';
import path from 'path';

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
  test('Default example mapping from Designer', async () => {
    const file = path.join(__dirname, '..', 'fhir', 'mapping', 'flash-script-fhir-4.0-patient.txt');
    const mapping = fs.readFileSync(file);
    const requestBody = {
      input: mockInput,
      fume: mapping.toString()
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
      'category[VSCat]': [
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
        'coding[BPCode]': [
          {
            system: 'http://loinc.org',
            code: '85354-9'
          }
        ]
      },
      'component[SystolicBP]': [
        {
          code: {
            'coding[SBPCode]': [
              {
                system: 'http://loinc.org',
                code: '8480-6'
              }
            ]
          }
        }
      ],
      'component[DiastolicBP]': [
        {
          code: {
            'coding[DBPCode]': [
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
            * deceasedDateTime = $now()
        `;
    const requestBody = {
      input: mockInput,
      fume: mapping
    };

    const res = await request(globalThis.app).post('/').send(requestBody);
    expect(res.body.deceasedBoolean).toBe(undefined);
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

  test.skip('Case 12 - aliases stopped working', async () => {
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
    expect(_.omit(res.body, 'id')).toStrictEqual(
      {
        resourceType: 'Patient',
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
            system: 'USA',
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
