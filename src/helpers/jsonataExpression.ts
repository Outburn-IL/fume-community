/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import jsonata from 'jsonata';

export interface InternalJsonataExpression {
  translateCodeExtract: jsonata.Expression
  translateCodingExtract: jsonata.Expression
  searchSingle: jsonata.Expression
  literal: jsonata.Expression
  initCap: jsonata.Expression
  duplicate: jsonata.Expression
  selectKeys: jsonata.Expression
  omitKeys: jsonata.Expression
  v2normalizeKey: jsonata.Expression
  v2json: jsonata.Expression
  parseFumeExpression: jsonata.Expression
  constructLineIterator: jsonata.Expression
  extractNextLink: jsonata.Expression
  bundleToArrayOfResources: jsonata.Expression
  structureMapsToMappingObject: jsonata.Expression
  aliasResourceToObject: jsonata.Expression
  conceptMapToTable: jsonata.Expression
  createRawPackageIndexObject: jsonata.Expression
  fixPackageIndexObject: jsonata.Expression
  extractCurrentPackagesFromIndex: jsonata.Expression
  checkPackagesMissingFromIndex: jsonata.Expression
  isEmpty: jsonata.Expression
  codeSystemToDictionary: jsonata.Expression
  valueSetExpandDictionary: jsonata.Expression
  testCodeAgainstVS: jsonata.Expression
  testCodingAgainstVS: jsonata.Expression
  testCodeableAgainstVS: jsonata.Expression
};

const expressions: InternalJsonataExpression = {
  translateCodeExtract: jsonata('$mapFiltered.code'),
  translateCodingExtract: jsonata(`$result.[
    {
      'system': target,
      'code': code
    },
    {
      'system': source,
      'code': $input
    }
  ]`),
  searchSingle: jsonata(`(
    $assert(
      $bundle.total <= 1, 
      'The search ' 
      & $bundle.link[relation='self'].url 
      & ' returned multiple matches - criteria is not selective enough'
    );
    $bundle.entry[search.mode='match'][0].resource
  )`),
  literal: jsonata(`(
    $r := $searchSingle($query, $params);
    $r.resourceType = 'OperationOutcome' ? $error($string($r));
    $exists($r.resourceType) ? $r.resourceType & '/' & $r.id : undefined
  )`),
  initCap: jsonata(`(
    $words := $trim($)~>$split(" ");
    ($words.$initCapOnce($))~>$join(' ')
  )`),
  duplicate: jsonata('$join([1..$times].($str))'),
  selectKeys: jsonata('$in.$sift($, function($v, $k) {$k in $skeys})'),
  omitKeys: jsonata('$in.$sift($, function($v, $k) {($k in $okeys)=false})'),
  v2normalizeKey: jsonata(`(
    $cached := $lookup($keyMap, $);
    $exists($cached) = false 
      ? (
        $titleCased := ($split($initCap($replace($,"'", '')), ' ')~>$join);
        $dtmFixed := $titleCased.$replace('Date/Time', 'DateTime') ~> $replace('Date / Time', 'DateTime');
        `.concat(
      // eslint-disable-next-line @typescript-eslint/indent
        // eslint-disable-next-line no-useless-escape, @typescript-eslint/indent
        `$underscored := $replace($dtmFixed, /[-\+".()\\//]/, '_');
        $registerV2key($, $underscored);
        $underscored;
      )
      : ($cached);
    
  )`)),
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
  parseFumeExpression: jsonata(`
    (
      $lines:=[$splitLineFunc($expr)];
      $lines:=$lines[$not($startsWith($trim($),"*") and $endsWith($trim($), "undefined"))];
      $lines:=$append($lines,"");
      $join(
        (
          ($lines)#$i.$lineParser($, $i, $lines)
        ),
        "\r\n"
      )
    )`
  ),
  constructLineIterator: jsonata(`
    (
      $first := $nodes[0].$construct($prefix, $, '', $context, true);
      $middle := $nodes#$i[$i>0 and $i<($count($nodes)-1)].$construct('', $, '', '', true);
      $last := $nodes[-1].$construct('', $, $value, '', false);
      $join([
        $first,
        $middle,
        $last
      ])
    )`
  ),
  extractNextLink: jsonata('link[relation=\'next\'].url'),
  bundleToArrayOfResources: jsonata('[$bundleArray.entry.resource]'),
  structureMapsToMappingObject: jsonata(`
    ($[
      resourceType='StructureMap' 
      and status='active' 
      and useContext[
        code.system = 'http://snomed.info/sct'
        and code.code = '706594005'
      ].valueCodeableConcept.coding[
        system = 'http://codes.fume.health'
      ].code = 'fume'
    ]){
      id: group[name = 'fumeMapping'].rule[name='evaluate'].extension[url = 'http://fhir.fume.health/StructureDefinition/mapping-expression'].valueExpression.expression
    }`
  ),
  aliasResourceToObject: jsonata('group.element{code: target.code}'),
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
  )`),
  fixPackageIndexObject: jsonata(`(
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

    $splitPackageVersion := function($filesEntry) {
        (
            $merge([$filesEntry, {'packageVersion': $splitVersionId($filesEntry.packageVersion)}])
        )
    };
    
    $bestFileByUrl := function($filePaths) {
        (
            $filesEntries := $filePaths@$fp.$splitPackageVersion($lookup($$.files, $fp));
            $sortedEntries := $filesEntries^(>date, packageName, >packageVersion.major, >packageVersion.minor, >packageVersion.patch, packageVersion.label);
            $sortedEntries[0].path;
        )
    };

    $bestFileById := function($filePaths) {
        (
            $filesEntries := $filePaths@$fp.$splitPackageVersion($lookup($$.files, $fp));
            $urls := $distinct($filesEntries.url);
            $urls@$url.$bestFileByUrl($filesEntries[url=$url].path);
        )
    };

    $bestFileByName := function($filePaths) {
        (
            $filesEntries := $filePaths@$fp.$splitPackageVersion($lookup($$.files, $fp));
            $urls := $distinct($filesEntries.url);
            $urls@$url.$bestFileByUrl($filesEntries[url=$url].path);
        )
    };

    $getDuplicates := function($obj) {
        $sift($obj, function($value) {$type($value) = 'array'})
    };

    $fixTypeByUrl := function($byUrl) {
        (
            $dups := $getDuplicates($byUrl);
            $dupsFixed := $keys($dups){
                $: $bestFileByUrl($lookup($dups, $))
            };
            $merge([$byUrl,$dupsFixed])
        )
    };

    $fixTypeById := function($byId) {
        (
            $dups := $getDuplicates($byId);
            $dupsFixed := $keys($dups){
                $: $bestFileById($lookup($dups, $))
            };
            $merge([$byId,$dupsFixed])
        )
    };    
    
    $fixTypeByName := function($byName) {
        (
            $dups := $getDuplicates($byName);
            $dupsFixed := $keys($dups){
                $: $bestFileByName($lookup($dups, $))
            };
            $merge([$byName,$dupsFixed])
        )
    };

    $fixType := function($typeObj) {
        (
            {
                'byUrl': $fixTypeByUrl($typeObj.byUrl),
                'byId': $fixTypeById($typeObj.byId),
                'byName': $fixTypeByName($typeObj.byName)
            }
        )
    };

    $fixVersion := function($versionObj) {
        (
            $types := $keys($versionObj);
            $types{
                $: $fixType($lookup($versionObj, $))
            }
        )
    };

    $versions := $keys($)[$not($ in ["packages", "files"])];

    $versions{
        'packages': $$.packages,
        'files': $$.files,
        $: $fixVersion($lookup($$, $))
    };
)`),
  extractCurrentPackagesFromIndex: jsonata('$keys(packages)'),
  checkPackagesMissingFromIndex: jsonata(`(
    $dirList := dirList.$replace('#', '@');
    
    $missingFromIndex := packages[$not($ in $dirList)];
    $missingFromCache := $dirList[$not($ in $$.packages)];

    [$append($missingFromIndex,$missingFromCache)];
  )`),
  isEmpty: jsonata(`(
    $_isEmpty := function($input) {(
      $exists($input) ? (
        $input in ['', null, {}, []] 
        or (
          $type($input) = 'string' 
          and $length($input) > 0 
          and $trim($input) = ''
        )
        ? true 
        : (
          $type($input) = 'object' 
            ? (
              $count(($keys($input).($lookup($input,$)).$not($_isEmpty($)))[$])=0
            )
            : $type($input) = 'array'
              ? (
                $count($input[$_isEmpty($)=false]) = 0
              ) 
              : false
        )
      ) : true
    )};
    $_isEmpty($value)
  )`),
  codeSystemToDictionary: jsonata('concept.**[$type($)="object"]{code:display}'),
  valueSetExpandDictionary: jsonata(`(
    $compose := $vs.(  
      $expandInclude := function($include){(
        $exists(filter) ? undefined : (
          $vs := $include.valueSet.$valueSetExpand($);
          $concepts := $exists($include.concept) ? $include.{system: concept{code: display}} : ($exists($include.system) ? $include.{system: $codeSystemDictionary(system)});
          $count($vs) > 0 ? (
            $exists($include.system) ? (
              $system = $include.system;
              {
                $system: $concepts.*.$sift(function($v,$k){(
                  $exists(
                    $vs.$lookup($system) ~> $lookup($k)
                  )
                )})
              }
            ) : (
              $vs
            )
          ) : $concepts
        )
      )};
    
      $countIncludes := $count(compose.include);
      $countExcludes := $count(compose.exclude);
    
      $includes := compose.$expandInclude(include);
      $excludes := compose.$expandInclude(exclude);
    
      $count($includes)=$countIncludes and $count($excludes)=$countExcludes ? (
        [$includes.(
          $currInclude := $;
          $systems := $keys($currInclude);
          $systems.(
            $system := $;
            $filteredDictionary := $lookup($currInclude, $system) ~> $sift(function($v,$k){(
              $not($exists($excludes.(
                $lookup($, $system) ~> $lookup($k)
              )))
            )});
            {$system: $filteredDictionary}
          )
        )]
      )
    );
    $count($compose) > 0 ? $compose
  )`),
  testCodeAgainstVS: jsonata(`(
    $allCodes := $merge($vs.*);
    $lookup($allCodes, $value);
  )`),
  testCodingAgainstVS: jsonata(`(
    $system := $coding.system;
    $code := $coding.code;
    $exists($system) and $exists($code) ? (
      $codes := $merge($vs.$lookup($, $system));
      $lookup($codes, $code);
    )
  )`),
  testCodeableAgainstVS: jsonata(`(
    $codings := $codeable.coding;
    $codings.$testCodingAgainstVS($, $vs);
  )`)
};

export default expressions;
