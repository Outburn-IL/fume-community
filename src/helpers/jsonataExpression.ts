/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import jsonata from 'jsonata';

export interface InternalJsonataExpression {
  v2json: jsonata.Expression
  conceptMapToTable: jsonata.Expression
  createRawPackageIndexObject: jsonata.Expression
};

const expressions: InternalJsonataExpression = {
  v2json: jsonata(`(
    $rawJson := $v2parse($);
    $v2version := $rawJson.segments[0].\`12\`;
  
    $dtToIso := function($dt){(
      $y := $substring($dt,0,4);
      $m := $substring($dt,4,2);
      $d := $substring($dt,6,2);
      $join([$y,$m,$d],'-')
    )};
  
    $dtmToIso := function($dtm){(
      $dt := $dtToIso($dtm);
      $hh := $substring($dtm,8,2);
      $mm := $substring($dtm,10,2);
      $ss := $substring($dtm,12,2);
      $tm := $join([($hh!=''?$hh),($mm!=''?$mm),($ss!=''?$ss)],':');
      $dt & ($tm!=''? 'T' & $tm)
    )};
  
    $parseValue := function($value, $datatype){(    
      $value = '' 
      ? 
        undefined 
      : $value.(
          $datatype = 'DT' ? $dtToIso($) : ($datatype = 'DTM' ? $dtmToIso($) : $)
        )
    )};
  
    $translateSubfield := function($subfield, $datatypeDef, $sfi){(
      $subfieldDef := $datatypeDef.subfields[$sfi];
      $subfieldDesc := $subfieldDef.desc;
      $subfieldDatatype := $subfieldDef.datatype;
      $sfDataTypeDef := $getDatatypeDef($subfieldDatatype, $v2version);
      $isComplex := $count($sfDataTypeDef.subfields)>0;
      $hasChildren := $count($subfield.fields)>0;
  
      $value := (
        $isComplex = false 
        ? $parseValue($subfield.value, $subfieldDatatype)
        : (
          /* it's a complex type */
          $hasChildren 
          ? ( 
            /* input has children */
            $subfield.fields@$subsubfield#$ssfi.$translateSubfield($subsubfield, $sfDataTypeDef, $ssfi){
              $normalizeKey(name): value
            };
          )
          : ( 
            /* input doesn't have children */
            $translateSubfield({'value': $subfield.value}, $sfDataTypeDef, 0){
              $normalizeKey(name): value
            }
          )
        )      
      );
  
      {
        'name': $subfieldDesc,
        'value': $value != {} ? $value
      }
    )};
  
    $translateField := function($field, $segDef, $fieldIndex){(
      $fieldDef := $segDef.fields[$fieldIndex];
      $fieldDesc := $fieldDef.desc;
      $fieldDesc := $type($fieldDesc) = 'string' and $startsWith($fieldDesc,'Set ID - ') and $fieldIndex=0 ? 'SetID' : $fieldDesc;
      $fieldDatatype := $fieldDef.datatype;
      $datatypeDef := $getDatatypeDef($fieldDatatype, $v2version);
      $isEnc := $segDef.segmentId='MSH' and $fieldIndex=1;
      $isComplex := $count($datatypeDef.subfields)>0;
      $hasChildren := $count($field.fields)>0;
  
      $value := (
        $isEnc ? $field.value : (
          $isComplex = false 
          ? $parseValue($field.value, $fieldDatatype)
          : (
            /* it's a complex type */
            $hasChildren 
            ? ( 
              /* input has children */
              $field.fields@$subfield#$sfi.$translateSubfield($subfield, $datatypeDef, $sfi){
                $normalizeKey(name): value
              };
            )
            : ( 
              /* input doesn't have children */
              $translateSubfield({'value': $field.value}, $datatypeDef, 0){
                $normalizeKey(name): value
              }
            )
          )
        )
      );
      $value := $value = {} ? undefined : $value;
      
      {
        'name': $fieldDesc,
        'value': $value
      };
    )};
  
    $translateSegment := function($segment){(
      $segId := $segment.\`0\`;
      $segDef := $getSegmentDef($segId, $v2version);
      $segment.fields#$i[$i>0].$translateField($, $segDef, $i-1){
        'SegmentDescription': $segDef.desc,
        $normalizeKey(name): value
      }
    )};
  
    $rawJson.segments@$s.$translateSegment($s){
      $s.\`0\`: $
    };  
  )`),
  conceptMapToTable: jsonata(`(
    $cm := (resourceType='Bundle' ? [entry[0].resource] : [$]);
  
    $merge(
      $cm#$i.id.{
        $: $merge(
          $distinct($cm[$i].group.element.code).(
            $code := $;
            {
              $code: $cm[$i].group.element[code=$code].target[
                equivalence='equivalent' 
                or equivalence='equal' 
                or equivalence='wider' 
                or equivalence='subsumes'
                or equivalence='relatedto'
              ].code.{
                "code": $, 
                "source": %.%.%.source, 
                "target": %.%.%.target
              }[]
            }
          )
        )
      }
    )
  )`),
  createRawPackageIndexObject: jsonata(`
  (
    $packageReplace := $replace(?,'#', '@');
  
    $packages := \${$packageReplace(package): $omitKeys($, ["package", "packageIndex"])};
  
    $files := ($.packageIndex.files[resourceType in ['StructureDefinition','ValueSet','CodeSystem','ConceptMap']].(
      $fullPath := $pathJoin(%.%.path, filename);
      $actualFile := $require($fullPath);
      $fhirVersion := $exists($actualFile.fhirVersion) ? $actualFile.fhirVersion : ($exists(%.%.packageManifest.fhirVersions) ? %.%.packageManifest.fhirVersions : %.%.packageManifest.\`fhir-version-list\`);
      $resourceName := ($type($actualFile.name)='string'?$actualFile.name);
      {
        'packageId': %.%.$packageReplace(package),
        'packageName': %.%.packageManifest.name,
        'packageVersion': %.%.packageManifest.version,
        'filename': filename,
        'path': $fullPath,
        'fhirVersion': $fhirVersion,
        'resourceType': resourceType,
        'id': id,
        'url': url,
        'name': $resourceName,
        'version': version,
        'kind': kind,
        'type': type,
        'baseDefinition': $actualFile.baseDefinition,
        'derivation': $actualFile.derivation,
        'date': $actualFile.date
      }
    )){path: $};
  
    {
      'packages': $packages,
      'files': $files
    }.(
      $structureDefinitions := files.*[resourceType='StructureDefinition'];
      $valueSets := files.*[resourceType='ValueSet'];
      $codeSystems := files.*[resourceType='CodeSystem'];
      $conceptMaps := files.*[resourceType='ConceptMap'];
      $fhirVersions := $distinct(files.*.fhirVersion);
      $packages := packages;
      $files := files;
  
      $splitVersionId := function($versionId) {(
        $parts := $split($versionId, '.');
        $major := $parts[0];
        $minor := $parts[1];
        $patch := $substringBefore($parts[2], '-');
        $label := $substringAfter($parts[2], '-');
        {
          'id': $versionId,
          'major': $isNumeric($major) ? $number($major) : 0,
          'minor': $isNumeric($minor) ? $number($minor) : 0,
          'patch': $isNumeric($patch) ? $number($patch) : 0,
          'label': $isNumeric($major)=false ? $major : $label != $patch ? $label : ''
        }
      )};
  
      $toMinorVersionId := function($versionId){
        $splitVersionId($versionId).($join([$string(major), $string(minor)], '.'))
      };
  
      $minorVersions := $distinct($fhirVersions.$toMinorVersionId($));
  
      $minorVersions{
        'packages': $packages,
        'files': $files,
        $: (
          $mv := $;
          {
            'structureDefinitions': (
              $sdefs := $files.*[resourceType = 'StructureDefinition' and $mv in (fhirVersion.$toMinorVersionId($))];
              {
                'byUrl': $sdefs{
                  url: path,
                  url & '|' & version: path
                },
                'byId': $sdefs{
                  id: path,
                  id & '|' & version: path
                },
                'byName': $sdefs{
                  name: path,
                  name & '|' & version: path
                }
              }
            ),
            'codeSystems': (
              $sdefs := $files.*[resourceType = 'CodeSystem' and $mv in (fhirVersion.$toMinorVersionId($))];
              {
                'byUrl': $sdefs{
                  url: path,
                  url & '|' & version: path
                },
                'byId': $sdefs{
                  id: path,
                  id & '|' & version: path
                },
                'byName': $sdefs{
                  name: path,
                  name & '|' & version: path
                }
              }
            ),
            'valueSets': (
              $sdefs := $files.*[resourceType = 'ValueSet' and $mv in (fhirVersion.$toMinorVersionId($))];
              {
                'byUrl': $sdefs{
                  url: path,
                  url & '|' & version: path
                },
                'byId': $sdefs{
                  id: path,
                  id & '|' & version: path
                },
                'byName': $sdefs{
                  name: path,
                  name & '|' & version: path
                }
              }
            ),
            'conceptMaps': (
              $sdefs := $files.*[resourceType = 'ConceptMap' and $mv in (fhirVersion.$toMinorVersionId($))];
              {
                'byUrl': $sdefs{
                  url: path,
                  url & '|' & version: path
                },
                'byId': $sdefs{
                  id: path,
                  id & '|' & version: path
                },
                'byName': $sdefs{
                  name: path,
                  name & '|' & version: path
                }
              }
            )
          }
        )
      }
    )
  )`)
};

export default expressions;
