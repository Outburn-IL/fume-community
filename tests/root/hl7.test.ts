/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
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
          fullUrl: 'urn:uuid:a90b9d31-dc81-5e0e-b881-8323bfa0c22c',
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
                      code: 'MR',
                      display: 'Medical record number'
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
          },
          request: {
            method: 'PUT',
            url: 'Patient/356a192b-7913-504c-9457-4d18c28d46e6'
          }
        },
        {
          fullUrl: 'urn:uuid:18dfdd9e-cf12-5806-8b8c-b383a6d18f59',
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
                reference: 'urn:uuid:a90b9d31-dc81-5e0e-b881-8323bfa0c22c'
              }
            ],
            coverage: [
              {
                coverage: {
                  reference: 'urn:uuid:4c25dba4-029c-509e-b43e-173ba4a46555'
                }
              }
            ]
          },
          request: {
            method: 'PUT',
            url: 'Account/5e683a84-b61b-587a-87c4-ac12c52f4adc'
          }
        },
        {
          fullUrl: 'urn:uuid:19257cf0-5a76-5f5f-88c6-49e14f8043e3',
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
              reference: 'urn:uuid:a90b9d31-dc81-5e0e-b881-8323bfa0c22c'
            },
            period: {
              start: '2005-01-10'
            },
            account: [
              {
                reference: 'urn:uuid:18dfdd9e-cf12-5806-8b8c-b383a6d18f59'
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
          },
          request: {
            method: 'PUT',
            url: 'Encounter/a202b052-7dbf-51f6-a269-7ece3d07b903'
          }
        },
        {
          fullUrl: 'urn:uuid:7952764c-fb11-5953-80ca-8bee5a4ba240',
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
                  code: 'unconfirmed',
                  display: 'Unconfirmed'
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
              reference: 'urn:uuid:a90b9d31-dc81-5e0e-b881-8323bfa0c22c'
            },
            encounter: {
              reference: 'urn:uuid:19257cf0-5a76-5f5f-88c6-49e14f8043e3'
            },
            onsetDateTime: '2023-04-06',
            recordedDate: '2023-04-06'
          },
          request: {
            method: 'PUT',
            url: 'Condition/2029de8a-c596-568d-8966-fd095f5421a1'
          }
        },
        {
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
          },
          request: {
            method: 'PUT',
            url: 'Organization/b1d57811-11d8-5f7b-bfe4-5a0852e59758'
          }
        },
        {
          fullUrl: 'urn:uuid:4c25dba4-029c-509e-b43e-173ba4a46555',
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
              reference: 'urn:uuid:a90b9d31-dc81-5e0e-b881-8323bfa0c22c'
            },
            payor: [
              {
                reference: 'urn:uuid:bc088c1b-a76c-5726-b9b8-303a96d5255a'
              }
            ]
          },
          request: {
            method: 'PUT',
            url: 'Coverage/3cdf996f-3ea0-5a0c-ad34-c695b523efa8'
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
        MessageLine: 1,
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
        MessageLine: 2,
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
        MessageLine: 3,
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
          MessageLine: 4,
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
          MessageLine: 5,
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
              display: 'Vital Signs',
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
            unit: 'millimeter of mercury',
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
            unit: 'millimeter of mercury',
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

  test('HL7 v2 with unknown fields', async () => {
    const input = getResourceFileContents('inputs', 'HL7-v2-UnknownFields.txt');
    const requestBody = {
      input,
      contentType: 'x-application/hl7-v2+er7',
      fume: '$'
    };

    const res = await request(globalThis.app).post('/').send(requestBody);

    expect(res.body).toStrictEqual({
      MSH: {
        SegmentDescription: 'Message header segment',
        MessageLine: 1,
        FieldSeparator: '|',
        EncodingCharacters: '^~\\&',
        SendingApplication: {
          NamespaceID: '1',
          UniversalID: 'Autolab',
          UniversalIDType: '3.02'
        },
        SendingFacility: {
          NamespaceID: '110',
          UniversalID: 'some_place'
        },
        ReceivingApplication: {
          NamespaceID: '34',
          UniversalID: 'HL7_PDF'
        },
        ReceivingFacility: {
          NamespaceID: '2400',
          UniversalID: 'HL7_PDF'
        },
        DateTimeOfMessage: {
          TimeOfAnEvent: '20240726083203'
        },
        MessageType: {
          MessageType: 'ORU',
          TriggerEvent: 'R01'
        },
        MessageControlID: '12345678',
        ProcessingID: {
          ProcessingID: 'P'
        },
        VersionID: '2.3',
        ContinuationPointer: '0^^',
        MSH20: '5'
      },
      OBX: {
        SegmentDescription: 'Observation segment',
        MessageLine: 2,
        SetID: '10',
        ValueType: 'TX',
        ObservationIdentifier: {
          Identifier: '0813321000',
          Text: 'esccol',
          AlternateText: 'Escherichia coli'
        },
        ObservationValue: '.',
        Units: {
          Identifier: '0',
          Text: '""'
        },
        ReferencesRange: '^',
        AbnormalFlags: 'N',
        ObservResultStatus: 'F',
        DateLastObsNormalValues: {
          TimeOfAnEvent: 'M'
        },
        UserDefinedAccessChecks: '104^714^ Micro_lab',
        DateTimeOfTheObservation: {
          TimeOfAnEvent: '20240725154900'
        },
        ProducersID: {
          Identifier: '9999',
          Text: 'Micro'
        },
        ResponsibleObserver: {
          IDNumber: '1234567-8',
          FamilyName: 'First',
          GivenName: 'last'
        },
        OBX18: '0',
        OBX19: '0^^^^^',
        OBX20: '^AutoComm^16^^^^^',
        OBX21: '9999^Micro^^^^',
        OBX22: '207^general^^^^',
        OBX24: '0810109809^genct^^^^',
        OBX26: '1',
        OBX27: '^system^routing^^^^^',
        OBX28: '20240725150000',
        OBX29: '^^',
        OBX30: 'N',
        OBX31: '1111111111',
        OBX32: '2222222222',
        OBX33: '33333333333'
      }
    });
  });

  test('HL7 v2 line numbering', async () => {
    const input = getResourceFileContents('inputs', 'HL7-v2-LineNumbering.txt');
    const requestBody = {
      input,
      contentType: 'x-application/hl7-v2+er7',
      fume: '$'
    };

    const res = await request(globalThis.app).post('/').send(requestBody);

    expect(res.body).toStrictEqual(
      {
        MSH: {
          SegmentDescription: 'Message header segment',
          MessageLine: 1,
          FieldSeparator: '|',
          EncodingCharacters: '^~\\&',
          SendingApplication: {
            NamespaceID: '1',
            UniversalID: 'Autolab',
            UniversalIDType: '3.02'
          },
          SendingFacility: {
            NamespaceID: '110',
            UniversalID: 'some_place'
          },
          ReceivingApplication: {
            NamespaceID: '34',
            UniversalID: 'HL7_PDF'
          },
          ReceivingFacility: {
            NamespaceID: '2400',
            UniversalID: 'HL7_PDF'
          },
          DateTimeOfMessage: {
            TimeOfAnEvent: '20240726083203'
          },
          MessageType: {
            MessageType: 'ORU',
            TriggerEvent: 'R01'
          },
          MessageControlID: '12345678',
          ProcessingID: {
            ProcessingID: 'P'
          },
          VersionID: '2.3',
          ContinuationPointer: '0^^',
          MSH20: '5'
        },
        ORC: {
          SegmentDescription: 'Common order segment',
          MessageLine: 2,
          PlacerOrderNumber: {
            EntityIdentifier: '2222222222'
          },
          OrderStatus: 'CM',
          DateTimeOfTransaction: {
            TimeOfAnEvent: '20240725154900'
          },
          EnteredBy: {
            IDNumber: '207',
            FamilyName: 'first',
            GivenName: 'last'
          },
          OrderingProvider: {
            IDNumber: '1234567',
            FamilyName: 'first',
            GivenName: 'last'
          },
          EnteringOrganization: {
            Identifier: 'general'
          },
          ORC20: 'N',
          ORC21: 'N',
          ORC22: '555555555',
          ORC23: 'N^Y',
          ORC25: '403aa3gec5fb33efd666666cd45b1e5a'
        },
        NTE: [
          {
            SegmentDescription: 'Notes and comments segment',
            MessageLine: 3,
            SourceOfComment: 'O',
            Comment: ' Clinical_diagnosis:MDS',
            NTE4: '0'
          },
          {
            SegmentDescription: 'Notes and comments segment',
            MessageLine: 5,
            SetID: '15151515',
            SourceOfComment: 'O',
            Comment: 'new_sample',
            NTE4: '1'
          },
          {
            SegmentDescription: 'Notes and comments segment',
            MessageLine: 7,
            SetID: '15471137',
            SourceOfComment: 'O',
            Comment: 'updated_result',
            NTE4: '1'
          }
        ],
        OBR: {
          SegmentDescription: 'Observation request segment',
          MessageLine: 4,
          SetID: '1',
          FillerOrderNumber: {
            EntityIdentifier: '830814256'
          },
          ObservationDateTime: {
            TimeOfAnEvent: '20240718195000'
          },
          CollectionVolume: {
            Quantity: '0'
          },
          CollectorIdentifier: {
            GivenName: 'auto'
          },
          SpecimenReceivedDateTime: {
            TimeOfAnEvent: '20240718210300'
          },
          SpecimenSource: {
            SpecimenSourceNameOrCode: {
              Identifier: '0'
            }
          },
          Quantity_Timing: {
            Duration: '0'
          },
          OBR44: '0',
          OBR45: '4^green^^^^',
          OBR46: '1^Blood^^^^'
        },
        OBX: {
          SegmentDescription: 'Observation segment',
          MessageLine: 6,
          SetID: '10',
          ValueType: 'TX',
          ObservationIdentifier: {
            Identifier: '0813321000',
            Text: 'esccol',
            AlternateText: 'Escherichia coli'
          },
          ObservationValue: '.',
          Units: {
            Identifier: '0',
            Text: '""'
          },
          ReferencesRange: '^',
          AbnormalFlags: 'N',
          ObservResultStatus: 'F',
          DateLastObsNormalValues: {
            TimeOfAnEvent: 'M'
          },
          UserDefinedAccessChecks: '104^714^ Micro_lab',
          DateTimeOfTheObservation: {
            TimeOfAnEvent: '20240725154900'
          },
          ProducersID: {
            Identifier: '9999',
            Text: 'Micro'
          },
          ResponsibleObserver: {
            IDNumber: '1234567-8',
            FamilyName: 'First',
            GivenName: 'last'
          },
          OBX18: '0',
          OBX19: '0^^^^^',
          OBX20: '^AutoComm^16^^^^^',
          OBX21: '9999^Micro^^^^',
          OBX22: '207^general^^^^',
          OBX24: '0810109809^genct^^^^',
          OBX26: '1',
          OBX27: '^system^routing^^^^^',
          OBX28: '20240725150000',
          OBX29: '^^',
          OBX30: 'N',
          OBX31: '1111111111',
          OBX32: '2222222222',
          OBX33: '33333333333'
        }
      });
  }

  );
});
