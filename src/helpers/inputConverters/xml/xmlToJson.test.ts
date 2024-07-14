/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { test } from '@jest/globals';

import { parseXml } from '.';

describe('xmlToJson', () => {
  test('fhir nested xml extension', () => {
    const xml: string = `
<address attribute1="foo">
        <extension url="http://hl7.org/fhir/StructureDefinition/geolocation">
            <extension url="longitude">
                <valueDecimal value="34.764885" />
            </extension>
            <extension url="latitude">
                <valueDecimal value="32.058317" />
            </extension>
        </extension>
</address>`;
    expect(parseXml(xml)).toEqual({
      extension: {
        url: 'http://hl7.org/fhir/StructureDefinition/geolocation',
        extension: [
          {
            url: 'longitude',
            valueDecimal: '34.764885'
          },
          {
            url: 'latitude',
            valueDecimal: '32.058317'
          }
        ]
      },
      attribute1: 'foo',
      _xmlTagName: 'address'
    }
    );
  });

  test('c-cda observation', () => {
    const xml: string = `
<observation classCode="OBS" moodCode="EVN">
  <templateId root="2.16.840.1.113883.10.20.22.4.31" />
  <!-- Age observation -->
  <code code="445518008" 
        codeSystem="2.16.840.1.113883.6.96"
        displayName="Age At Onset" />
  <statusCode code="completed" />
  <value xsi:type="PQ" value="57" unit="a" />
</observation>`;
    expect(parseXml(xml)).toEqual({
      templateId: {
        root: '2.16.840.1.113883.10.20.22.4.31'
      },
      code: {
        code: '445518008',
        codeSystem: '2.16.840.1.113883.6.96',
        displayName: 'Age At Onset'
      },
      statusCode: {
        code: 'completed'
      },
      value: '57',
      _value: {
        'xsi:type': 'PQ',
        unit: 'a'
      },
      _xmlTagName: 'observation',
      classCode: 'OBS',
      moodCode: 'EVN'
    }
    );
  });

  test.skip('namespaced xml', async () => {
    const xml: string = `
<tst1:Patient xmlns:tst1="http://test.tst.example.com/HIJ/FIRE/test1.xsd" xmlns:tst2="http://test.tst.example.com/HIJ/FIRE/test2.xsd" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <tst2:Header>
    <tst2:TransactionID>kdkdkdkdkdkdkdk</tst2:TransactionID>
    <tst2:TransactionName>TBD</tst2:TransactionName>
    <tst2:MessageID>N1AD14A36</tst2:MessageID>
    <tst2:MessageName>TBD</tst2:MessageName>
    <tst2:HospitalCode>09909</tst2:HospitalCode>
    <tst2:EventType>CREATE</tst2:EventType>
    <tst2:EventDateTime>2024-07-10T11:31:34.959+03:00</tst2:EventDateTime>
  </tst2:Header>
  <tst1:CreatePatientType>
    <tst1:PatientID>0000000026</tst1:PatientID>
    <tst1:HMOCode>11</tst1:HMOCode>
    <tst1:HMODesc>כללית</tst1:HMODesc>
    <tst1:BirthCountryCode/>
    <tst1:GenderChange>true</tst1:GenderChange>
    <tst1:NationalityCode/>
    <tst1:NationalityDesc/>
    <tst1:PassportID/>
    <tst1:PhoneType>
      <tst1:PhoneNum>052-9999999</tst1:PhoneNum>
      <tst1:Priority>1</tst1:Priority>
    </tst1:PhoneType>
    <tst1:PhoneType>
      <tst1:PhoneNum>04-8888888</tst1:PhoneNum>
      <tst1:Priority>2</tst1:Priority>
    </tst1:PhoneType>
    <tst1:AddressType>
      <tst1:ResidenceCountry>IL</tst1:ResidenceCountry>
      <tst1:BuildingNum/>
      <tst1:EntranceID/>
      <tst1:DepartmentNum/>
      <tst1:CityCodeID>4000</tst1:CityCodeID>
    </tst1:AddressType>
  </tst1:CreatePatientType>
</tst1:Patient>
`;
    expect(parseXml(xml)).toEqual({
      header: {
        TransactionID: 'kdkdkdkdkdkdkdk',
        _TransactionID: {
          _namespace: 'tst2'
        },
        TransactionName: 'TBD',
        _TransactionName: { _namespace: 'tst2' },
        HospitalCode: '09909',
        _HospitalCode: { _namespace: 'tst2' }
      },
      CreatePatientType: {
        PatientID: '0000000026',
        _PatientID: { _namespace: 'tst1' },
        HMOCode: '11',
        _HMOCode: { _namespace: 'tst1' },
        HMODesc: 'כללית',
        _HMODesc: { _namespace: 'tst1' },
        GenderChange: 'true',
        _GenderChange: { _namespace: 'tst1' },
        PhoneType: [
          {
            PhoneNum: '052-9999999',
            _PhoneNum: { _namespace: 'tst1' },
            Priority: '1',
            _Priority: { _namespace: 'tst1' },
            _namespace: 'tst1'
          },
          {
            PhoneNum: '04-8888888',
            _PhoneNum: { _namespace: 'tst1' },
            Priority: '2',
            _Priority: { _namespace: 'tst1' },
            _namespace: 'tst1'
          }
        ],
        AddressType: {
          ResidenceCountry: 'IL',
          _ResidenceCountry: { _namespace: 'tst1' },
          CityCodeID: '4000',
          _CityCodeID: { _namespace: 'tst1' },
          _namespace: 'tst1'
        },
        _namespace: 'tst1'
      },
      _namespace: 'tst1',
      _xmlTagName: 'Patient'
    });
  });

  test('fhir xml observation', () => {
    const xml: string = `
<Observation xmlns="http://hl7.org/fhir">
  <id value="f001"/> <text> <status value="generated"/> <div xmlns="http://www.w3.org/1999/xhtml"><p> <b> Generated Narrative with Details</b> </p> <p> <b> id</b> : f001</p> </div> </text> <identifier> 
    <use value="official"/> 
    <system value="http://www.bmc.nl/zorgportal/identifiers/observations"/> 
    <value value="6323"/> 
  </identifier> 
  <status value="final"/> 
  <code> 
    <coding> 
      <system value="http://loinc.org"/> 
      <code value="15074-8"/> 
      <display value="Glucose [Moles/volume] in Blood"/> 
    </coding> 
  </code> 
  <subject> 
    <reference value="Patient/f001"/> 
    <display value="P. van de Heuvel"/> 
  </subject> 
  <effectivePeriod> 
    <start value="2013-04-02T09:30:10+01:00"/> 
  </effectivePeriod> 
  <issued value="2013-04-03T15:30:10+01:00"/> 
  <performer> 
    <reference value="Practitioner/f005"/> 
    <display value="A. Langeveld"/> 
  </performer> 
  <valueQuantity> 
    <value value="6.3"/> 
    <unit value="mmol/l"/> 
    <system value="http://unitsofmeasure.org"/> 
    <code value="mmol/L"/> 
  </valueQuantity> 
</Observation> 
    `;
    expect(parseXml(xml)).toEqual({
      resourceType: 'Observation',
      id: 'f001',
      text: {
        status: 'generated',
        div: '<div xmlns="http://www.w3.org/1999/xhtml"><p> <b> Generated Narrative with Details</b> </p> <p> <b> id</b> : f001</p> </div>'
      },
      identifier: {
        use: 'official',
        system: 'http://www.bmc.nl/zorgportal/identifiers/observations',
        value: '6323'
      },
      status: 'final',
      code: {
        coding: {
          system: 'http://loinc.org',
          code: '15074-8',
          display: 'Glucose [Moles/volume] in Blood'
        }
      },
      subject: {
        reference: 'Patient/f001',
        display: 'P. van de Heuvel'
      },
      effectivePeriod: {
        start: '2013-04-02T09:30:10+01:00'
      },
      issued: '2013-04-03T15:30:10+01:00',
      performer: {
        reference: 'Practitioner/f005',
        display: 'A. Langeveld'
      },
      valueQuantity: {
        value: '6.3',
        unit: 'mmol/l',
        system: 'http://unitsofmeasure.org',
        code: 'mmol/L'
      }
    }
    );
  });

  test.skip('xml declaration tag', () => {
    const xml: string = `
<?xml version="1.0" encoding="UTF-8"?>

<Observation xmlns="http://hl7.org/fhir">
  <id value="f001"/>
  <status value="final"/> 
</Observation> 
    `;
    expect(parseXml(xml)).toEqual({
      resourceType: 'Observation',
      id: 'f001',
      status: 'final'
    }
    );
  });
});
