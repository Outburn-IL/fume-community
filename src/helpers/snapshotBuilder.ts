/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import fumifier, { FumifierCompiled } from 'fumifier';

import { ILogger } from '../types';
import { IFhirPackageIndex } from './conformance';
import { getStructureDefinition as getRawDefinition } from './jsonataFunctions';
import { omitKeys } from './objectFunctions';
import parser from './parser';
import { endsWith, startsWith } from './stringFunctions';

const expressions = {
  polyNameWithoutX: fumifier(`(
    /* take last node name and remove the [x] part */
    /* $polyId is the element id */
    ($polyId.$split('.')[-1]) ~> $substringBefore('[x]');
  )`),
  fixMonoPolySlicesIterator: fumifier(`
  (
    /* @param: $depth (num) */
    /* @param: $diff (array of elements)*/
    
    /* find all polymorphics with a single type in this depth level */
    $monoPolyHeads := [$diff[$endsWith(id, '[x]') and $count(type) = 1 and $count($split(id,'.')) = $depth+1]];


    /* if non found, return $diff unchanged */
    $count($monoPolyHeads) = 0 ? $diff : (
      /* for each monopoly head, find slice entries */
      $monoPolySliceHeads := $monoPolyHeads#$i.(
        $head := $;
        $typeName := $head.type[0].code;
        $titleCaseType := $toTitleCase($typeName);
        $nodeName := $polyNameWithoutX($head.id);
        $sliceName := $nodeName & $titleCaseType;
        $sliceHead := $diff[id = $head.id & ':' & $sliceName]; 
        $exists($sliceHead) ? {
          '__head': $head,
          '__headChildren': $diff[$startsWith(id, $head.id & '.')].$merge([$,{'__relativeId': $substringAfter(id, $head.id & '.')}]),
          '__slice': $sliceHead,
          '__sliceChildren': $diff[$startsWith(id, $sliceHead.id & '.')].$merge([$,{'__relativeId': $substringAfter(id, $sliceHead.id & '.')}])
        }
      );

      /* if no slice entries found, return $diff unchanged */
      $count($monoPolySliceHeads) = 0 ? $diff : (
        /* create an array with corrected elements that can be used later to fix $diff */
        $correctionArray := $monoPolySliceHeads.(
          /* for each slice head: */
          /* 1. merge into monopoly head, preserving monopoly id and removing slice attributes */
          /* 2. merge children into monopoly children, preserving monopoly id's */
          /* 3. fix remaining children id's */
          $mergedHead := ($mergeElementDefinition([__head, __slice, {'id': __head.id}])) ~> $omitKeys(['slicing', 'sliceName']);
          $headChildren := __headChildren;
          $sliceChildren := __sliceChildren;
          $headId := __head.id;
          $sliceId := __slice.id;
          $mergedHeadChildren := $headChildren.(
            $headChild := $;
            $sliceChild := $sliceChildren[__relativeId = $headChild.__relativeId];
            $mergeElementDefinition(
              [
                $headChild, 
                $sliceChild, 
                {'id': $headChild.id, '__sliceChildId': $sliceChild.id}
              ]
            )
          );
          $remainingSliceChildren := $sliceChildren[$not(__relativeId in $headChildren.__relativeId)].$merge([
            $,
            {
              'id': $headId & '.' & __relativeId,
              '__sliceChildId': id
            }
          ]);

          {
            '__headId': $headId,
            '__sliceId': $sliceId,
            '__mergedHead': $mergedHead,
            '__mergedChildren': [$mergedHeadChildren, $remainingSliceChildren]
          }
        );
        /* then go through $diff, rearrange it and return it */
        $headMap := $correctionArray{__headId: __mergedHead};
        $headOmitMap := $correctionArray{__sliceId: {}};
        $childMap := [($correctionArray.__mergedChildren)]{id: $};
        $childOmitMap := [($correctionArray.__mergedChildren)]{__sliceChildId: {}};
        $diff.(
          /* check if in headMap, if so - return it */
          $headOverride := $lookup($headMap, id);
          $exists($headOverride) ? $headOverride : (
            /* check if in headOmit, if so - omit it */
            $headOmit := $lookup($headOmitMap, id);
            $exists($headOmit) ? undefined : (
              /* check in child map, if there - return it */
              $childOverride := $lookup($childMap, id);
              $exists($childOverride) ? $childOverride : (
                /* check in child omit, if there - omit it */
                $childOmit := $lookup($childOmitMap, id);
                $exists($childOmit) ? undefined : (
                  /* element not affected - return unchanged */
                  $
                )
              )
            )
          )
        )
      )
    )
  )
  `),
  fixMonoPolySlicesDiff: fumifier(`
    (
      /* $def is the raw StructureDefinition resource */
      $def.derivation = 'constraint' ? (
        $originalDiff := $def.differential.element[];
        $maxDepth := $max($originalDiff.($count($split(id, '.')))) - 1;
        $newDiff := $reduce(
          [1..$maxDepth],
          $fixMonoPolySlicesIterator,
          $originalDiff
        );
        $merge([$def, {'differential': {'element': [$newDiff]}}]);
      ) : (
        /* derivation is not 'constraint', this is a base type or logical model. */
        /* returning $def unchanged */
        $def
      );
    )  
  `),
  fixMonoPolySlicesSnap: fumifier(`
    (
      /* $def is the raw StructureDefinition resource */
      $def.derivation = 'constraint' ? (
        $originalSnap := $def.snapshot.element[];
        $maxDepth := $max($originalSnap.($count($split(id, '.')))) - 1;
        $newSnap := $reduce(
          [1..$maxDepth],
          $fixMonoPolySlicesIterator,
          $originalSnap
        );
        $merge([$def, {'snapshot': {'element': [$newSnap]}}]);
      ) : (
        /* derivation is not 'constraint', this is a base type or logical model. */
        /* returning $def unchanged */
        $def
      );
    )  
  `),
  toNamedMonoPoly: fumifier(`
    (
      /* this function gets an element definition of a mono-poly element */
      /* and returns its id in the shortcut (named type) form: */
      /* valueCode, deceasedBoolean etc. */
      $typeName := $element.type.code[0];
      $titleCaseType := $uppercase($substring($typeName, 0, 1)) & $substring($typeName, 1);
      $idWithoutX := $substring($element.id, 0, $length($element.id)-3);
      $idWithoutX & $titleCaseType;
    )
  `),
  polySliceToNamedMonoPoly: fumifier(`
    (
      /* take an element in the form Xx.value[x]:valueQuantity */  
      /* and return it's id in the named form: Xx.valueQuantity */
      $endsWith($element.id, ':' & $element.sliceName) ? (
        $nodes := $split($element.id, '.');
        $pathNodes := $nodes#$i[$i < ($count($nodes)-1)];
        $newIdNodes := [$pathNodes, $element.sliceName];
        $join($newIdNodes, '.');
      )
    )
  `),
  toPolySlice: fumifier(`
    (
      /* this function gets an element definition of a mono-poly element */
      /* and returns its id in the long (sliced) form: */
      /* value[x]:valueCode, deceased[x]:deceasedBoolean etc. */
      $namedPolyId := $toNamedMonoPoly($element);
      $sliceName := $split($namedPolyId, '.')[-1];
      $element.id & ':' & $sliceName;
    )
  `),
  isMonoPolyMatch: fumifier(`
    (
      /* returns true if the diff element matches the snapshot one */
      /* according to the mono-poly matching rules */
      $isMonoPoly($snapElement) and (
        $diffElement.id in [$toNamedMonoPoly($snapElement), $toPolySlice($snapElement)]
      )
    )
  `),
  polyToMonoPolies: fumifier(`
    (
      /* takes a single polymorphic element and returns an array of monopolies. */
      /* each monopoly returned has only a single type */
      $types := $polyElement.type;
      $types@$thisType.(
        /* for each type, return the element with this type only */
        $merge([$polyElement, {'type': [$thisType]}])
      )
    )
  `),
  isExplicitSlice: fumifier(`
    (
      /* checks if a diff is an explicit slice entry on the snapshot element */
      /* slice entries should have a sliceName and an id that ends with :sliceName */
      $exists($snapElement) and $exists($diffElement) ? (
        $startsWith($diffElement.id, $snapElement.id & ':')
        and $substringAfter($diffElement.id, $snapElement.id & ':') = $diffElement.sliceName
      )
    )
  `),
  implicitToExplicitSlice: fumifier(`
    (
      /* checks if a diff is an implicit slice on the snapshot element */
      /* and if it is, returns it with the correct id, type and sliceName. */
      /* if it isn't, returns undefined */
      /* this is only relevant for polymorphic snapshot elements */
      $isPoly($snapElement) and $count($snapElement.type) > 1 ? (
        $monopolies := $polyToMonoPolies($snapElement);
        
        $monopolies@$this.(
          $namedMonoPoly := $toNamedMonoPoly($this);
          $diffElement.id = $namedMonoPoly ? (
            $correctId := $toPolySlice($this);
            $sliceName := $split($correctId, ':')[-1];
            $correctionObj := {
              'id': $correctId,
              'type': [$this.type],
              'sliceName': $sliceName,
              '_diffId': $diffElement.id
            };
            $head := $omitKeys($snapElement, ['slicing']);
            $merge([$head, $diffElement, $correctionObj])
          )
        ) 
      )
    )
  `),
  mergeElementDefinition: fumifier(`
    (
      /* first append all constraints */
      $constraints := $arrayOfElements.constraint;
      $constraintIds := $distinct($constraints.key);
      $constraintArray := $constraintIds@$thisKey.(
        $merge($constraints[key=$thisKey]);
      );
      $constraintsObj := {
        'constraint': $count($constraintArray) > 0 ? [$constraintArray]
      };
      $conditions := $arrayOfElements.condition;
      $conditionsObj := {
        'condition': $count($conditions) > 0 ? [$distinct($conditions)]
      };

      /* then simply merge everything */
      $res := $merge([$arrayOfElements, $conditionsObj, $constraintsObj]);
      $res;
    )
  `),
  fetchSliceEntries: fumifier(`
    (
      /* if there are slice entries for this element, return them */
      /* this includes: */
      /* 1. explicit slices */
      /* 2. implicit slices on type($this) under polymorphics */

      $slicingHead := $omitKeys($snapElement, ['slicing']);
      $expSliceEntries := $diffArray[$isExplicitSlice($snapElement, $)];
      
      $expSliceEntries := $expSliceEntries@$thisSlice.(
        /* merge each slice entry with head element */
        /* (but removing the 'slicing' attribute) */
        /* and add the '_diffId' attribute */
        $mergeElementDefinition([$slicingHead, $thisSlice, { '_diffId': $thisSlice.id }]);
      );

      $impSliceEntries := $diffArray@$this.(
        $implicitToExplicitSlice($snapElement, $this)
      );

      [$expSliceEntries, $impSliceEntries];
    )
  `),
  fixDiffIds: fumifier(`
    (
      $changedIds := $inputObject.wipSnapshot[id != _diffId].{
        'id': id,
        '_diffId': _diffId
      };
      $fixedDiff := $inputObject.wipDifferential@$thisDiff.(
        /* check if this diff's id starts with one of the changed ones */
        $idToChange := ($changedIds@$changed.(
          $startsWith($thisDiff.id, $changed._diffId & '.') ? $changed;
        ))[-1];
        $exists($idToChange) ? (
          $merge([$thisDiff, {'id': $idToChange.id & $substringAfter($thisDiff.id, $idToChange._diffId)}]);
        ) : $thisDiff;
      );
      {
        'wipDifferential': $fixedDiff,
        'profileSnap': $inputObject.profileSnap,
        'wipSnapshot': $inputObject.wipSnapshot
      }
    )
  `),
  fetchDiffElement: fumifier(`
    (
      /* if there's a diff that should be applied to this element - returns it */

      $diffElement := ($diffArray[id = $snapElement.id or $isMonoPolyMatch($snapElement, $) or id = $polySliceToNamedMonoPoly($snapElement)]);
      $allSlicesId := $getLastAllSlicesId($snapElement.id);
      $diffAllSlicesElement := $diffArray[id = $allSlicesId];
      $diffAllSlicesElement := $exists($diffAllSlicesElement) ? (
        $omitKeys($diffAllSlicesElement, ['id', 'path'])
      );

      /* return the diff element without the id and path, but add _diffId attribute */
      /* to retain the relationship to the original diff element id */
      $res := $diffElement@$this.(
        $newThis := $merge([$omitKeys($this, ['id', 'path']), {'_diffId': $this.id}]);
        $exists($diffAllSlicesElement) ? $mergeElementDefinition([$diffAllSlicesElement, $newThis]) : $newThis;
      );
      
      $res;
    )
  `),
  removeSliceFromId: fumifier(`
    (
      $exists($element.sliceName) ? (
        $endsWith($element.id, ':' & $element.sliceName) ? (
          $substring($element.id, 0, $length($element.id) - $length($element.sliceName) - 1)
        ) : $element.id
      ) : $element.id
    )
  `),
  getLastAllSlicesId: fumifier(`
    (
      /* if element id has a slice in the path, remove the last slice */
      /* to get the id of the same element in the "all slices" section */

      $parts := $split($elementId, ':');

      $count($parts) > 1 ? (
        $lastPart := $parts[-1];
        $unsliced := $substringAfter($lastPart,'.');
        $partsBefore := $join($parts#$i[$i < ($count($parts) - 1)], ':');
        $partsBefore & '.' & $unsliced;
      );
    )
`),
  changeRoot: fumifier(`
    (
      /* gets an element list and changes the root id and path */
      /* it also merges the root element with the new one */
      $oldRootElement := $elementArray[0];
      $elementArray@$thisElement.(
        $thisElement.id = $oldRootElement.id ? (
          /* first element */
          $merge([$thisElement, $newRootElement])
        ) : (
          /* children */
          $newIdAndPath := {
            'id': $newRootElement.id & '.' & $substringAfter($thisElement.id, $oldRootElement.id & '.'),
            'path': $newRootElement.path & '.' & $substringAfter($thisElement.path, $oldRootElement.path & '.')
          };
          $merge([$thisElement, $newIdAndPath])
        )
      )
    )
  `),
  getSliceEntriesId: fumifier(`
    (
      /* from an array of elements, return those that are slice entries */
      $res := $elements[$exists(sliceName) and $endsWith(id, ':' & sliceName)].id;
      [$res];
    )
  `),
  noDuplicateElements: fumifier(`
    (
      $res := $count(($elementArray{id: $count($distinct($))}.*)[$>1])=0;
      $res = false ? (
        (($elementArray{id: $count($distinct($))} ~> $spread)[*>1] ~> $keys)@$id.(
          $e := $elementArray[id = $id];
          $info($e.id);
          $info($e);
        )
      );
      $res;
    )
  `),
  repositionSlices: fumifier(`
    (
      /* @params: $wipSnapshot, $originalBase, $level */
      /* reorder slice entries so original ones that exist in the snapshot come first */
      
      $assert($wipSnapshot ~> $noDuplicateElements,'Duplicate elements! (tag: 2)');
      /* get all id's of original slices of this level from original snapshot */
      
      $originalSlicesId := ($getSliceEntriesId($originalBase))[$getLevel($) = $level];

      /* get all non-slice entries of this level from the wip snapshot */
      $nonSliceEntries := $wipSnapshot[$getLevel($) = $level and ($exists(sliceName) = false or $endsWith(id, '[x]'))];

      $res := ($wipSnapshot[
        /* filter wip snapshot so only elements that aren't slices or aren't at this level remain */
        $getLevel($) != $level 
        or id in $nonSliceEntries.id
      ])@$this.(
        /* for each element return itself plus its slices in the right order */
        $getLevel($this) = $level ? (
          
          /* first slices are those that exist in original snapshot */
          $firstBlockOfSlices := $wipSnapshot[$getLevel($) = $level and $startsWith(id, $this.id & ':') and id in $originalSlicesId];
          
          /* then the slices introduced by the diff */
          $secondBlockOfSlices := $wipSnapshot[
            $getLevel($) = $level 
            and $startsWith(id, $this.id & ':') 
            and $endsWith(id, ':' & sliceName) 
            and $not(id in $firstBlockOfSlices.id)
          ];  
          
          [$this, $firstBlockOfSlices, $secondBlockOfSlices]
        ) : (
          /* if it's not at this level return $this only */
          $this
        )
      );
      $res;
    )
  `),
  generateSnapshot: fumifier(`
    (
      $generateSnapshot := function($profileId) {(
        $applyDifferential := function($base, $diff, $profileSnapshot){(

          /* applies all diffs on the base */
          /* optional: profileSnapshot - allows bringing implicit rules that */
          /*           the target profile has in the snapshot but not in the diff */
          /*           e.g. bp profile's constraint on the types of value[x] */
          
          $assert($count($base) > 0 and $count($diff) > 0, 'To apply differential both base and diff arrays must have entries.');
          $assert($base ~> $noDuplicateElements,'Duplicate elements! (tag: 0)');

          $applyDiffLevel := function($inputObject, $level, $originalBase){
            /* for each element in the requested level in the snapshot, apply diff */
            (
              $assert($inputObject.wipSnapshot ~> $noDuplicateElements,'Duplicate elements! (tag: 1)');

              /* re-create wip array with ancestors only, merged with any applicable diffs */
              
              $wipSnapshot := ($inputObject.wipSnapshot[$getLevel($) <= $level])@$snapElement.(
                /* check if element's depth matches the level */
                $currentDepth := $getLevel($snapElement);
                $currentDepth = $level ? (
                  /* if it matches, fetch diff element */
                  $diffElement := $fetchDiffElement($snapElement, $inputObject.wipDifferential);
                  /* apply implicit constraints on poly element that come from the original profile's snapshot. */
                  /* this is mainly done because of hl7's broken vitalsigns derived profiles (e.g. bp) */
                  $profileSnapElement := (
                    /* if original profile def has a snapshot, take the type of */
                    /* the corresponding element (only if it's polymorphic). */
                    $exists($inputObject.profileSnap) and $isPoly($snapElement) ? (
                      $inputObject.profileSnap[id=$snapElement.id].{ 'type': type }
                    )
                  );
                  
                  /* merge all into a single element definition */
                  $applied := $mergeElementDefinition([$snapElement, $profileSnapElement, $diffElement]);
                  
                  /* get slices of this element from diff */
                  
                  $slices := $fetchSliceEntries($applied, $inputObject.wipDifferential);
                  /* filter out slices that already exist in snapshot */
                  $slices := $slices[$not(id in $inputObject.wipSnapshot.id)];
                  /* return applied element followed by slices */
                  $res := [$applied, $slices];
                  
                  $res;
                ) : (
                  /* elements not in the requested level are returned unchanged */
                  $snapElement
                );
              );

              /* remove applied diffs from diff array */
              $remainingDiff := $inputObject.wipDifferential[(id in $wipSnapshot._diffId) = false];
              
              /* reposition slices - parent's first, new slices after */
              
              $assert($wipSnapshot ~> $noDuplicateElements,'Duplicate elements! (tag: 3)');
              $wipSnapshot := $repositionSlices($wipSnapshot, $originalBase, $level);
              
              $assert($wipSnapshot ~> $noDuplicateElements,'Duplicate elements! (tag: 4)');
    
              /* put children back in the wip array */
              $snapChildren := $inputObject.wipSnapshot[$getLevel($) > $level];
              
              $wipSnapshot := (
                
                $wipSnapshot@$this.(
                  $getLevel($this) < $level ? (
                    /* if level of this parent is less then current level (grand-ancsestor), return it as-is */
                    $this
                  ) :
                  /* if it's at the current level, return it plus any applicable children */
                  (
                    /* if it has children in the snapshot, return those */
                
                    $thisSnapChildren := ($count($snapChildren) > 0 ? $snapChildren[$startsWith(id, $this.id & '.')]);
                    $count($thisSnapChildren) > 0 ? (
                
                      /* but apply profile diff, if there is a profile on $this that has been introduced by diff */
                      $thisDiff := $inputObject.wipDifferential[id=$this.id];
                
                      $thisProfileUrl := $count($thisDiff.type) = 1 and $exists($thisDiff.type.profile) ? $thisDiff.type[0].profile[0];
                      $thisProfileDef := $exists($thisProfileDef) ? $getStructureDefinition($thisProfileUrl);
                      $thisProfileDiff := $exists($thisProfileDef) ? $thisProfileDef.differential.element;
                
                      $newRootElement := $merge([$this, {'id': $thisProfileDef.type, 'path': $thisProfileDef.type}]);
                      $thisSnapChildren := $exists($thisProfileDiff) ? (
                        $base := $changeRoot([$this, $thisSnapChildren], $newRootElement);
                        $assert($base ~> $noDuplicateElements,'Duplicate elements! (tag: 5)');
                        ($applyDifferential($base, $thisProfileDiff) ~> $changeRoot($this))[id != $this.id];
                      ) : $thisSnapChildren;
                      [$this, $thisSnapChildren]
                    ) : (
                      /* if it doesn't have children in the snapshot: */
                      /* A. fetch children of all slices from snapshot. if there are any, */
                      /*    it means we are in a new slice, and there are rules that apply on all slices' children. */
                      /*    + Another option that should behave just like "all slices" is contenReference */

                      $allSlicesId := (
                        $unslicedId := $removeSliceFromId($this);
                        $this.id = $unslicedId ? (
                          /* it's not a slice. check for contentReference */
                          $exists($this.contentReference) ? (
                            /* there is a contentReference, return the referenced id (skip the #) */
                            $this.contentReference ~> $substring(1);
                          ) : (
                            /* no contentReference, return $this.id */
                            $this.id;
                          )
                        ) : (
                          /* it's a slice, return all slices' id */
                          $unslicedId;
                        )
                      );

                      $allSlicesHead := $inputObject.wipSnapshot[id=$allSlicesId];
                      $thisAllSlicesChildren := $exists($allSlicesId) ? [$inputObject.wipSnapshot[$startsWith(id, $allSlicesId & '.')]] : [];                      
                      
                      /* B. expansion of $this by type/profile - the type/profile should now be up-to-date, and will define the children */
                      /*    If $this is poly, expand using the definition of Element (will only add id and extension).*/
                      $thisProfile := (
                        $count($this.type) > 1 ? (
                          /* poly */
                          'Element'
                        ) : (
                          /* mono or contentReference */
                          $exists($this.contentReference) ? $this.contentReference : (
                            $exists($this.type[0].profile) ? (
                              $this.type[0].profile[0]
                            ) : $this.type[0].code
                          )
                        )
                      );
                      
                      $diffChildren := (
                        $remainingDiff[$getLevel($) > $level and ($startsWith(id, $this.id & '.') or ($exists($allSlicesId) and $startsWith(id, $allSlicesId & '.')))]
                      );
                      
                      $childrenToAdd := $count($diffChildren) > 0 ? (
                       
                        $count($thisAllSlicesChildren) = 0 and $exists($thisProfile) and $not($startsWith($thisProfile, 'http://hl7.org/fhirpath/System.')) ? (
                        /* when A is empty, B should be done using simple snapshot generation. */
                          
                          $thisProfileSnapshot := $getSnapshot($thisProfile).snapshot.element;
                          ($changeRoot($thisProfileSnapshot, $this))[id != $this.id];
                        ) : (
                          /* when A is not empty:*/
                          /*   if $this is poly or a Backbone, take A without any changes.*/ 
                          $thisProfile in ['Element', 'BackboneElement'] ? (
                            ($changeRoot([$allSlicesHead,$thisAllSlicesChildren], $this))[id != $this.id]
                          ) : (
                            /*   $this is mono */
                            /*    if A's head is poly: */
                            $count($allSlicesHead.type) > 1 ? (
                              /*      add the specialization of the type and apply the diff of the profile */
                              $exists($thisProfile) ? (
                                $baseType := $this.type.code;
                                /* get the base datatype differential */
                                $baseTypeDifferential := ($getStructureDefinition($baseType).differential.element);
                                /* change its root to $this's id */
                                $baseTypeDifferential := $changeRoot($baseTypeDifferential, $this);
                                /* change all slice's children's root to this's id */
                                $thisAllSlicesChildrenNewRoot := $changeRoot([$allSlicesHead,$thisAllSlicesChildren], $this);
                                /* append so all slices' children come first and then the children of the base type */
                                $baseBeforeRootChange := [$thisAllSlicesChildrenNewRoot, $baseTypeDifferential[id != $this.id]];
                                $base := $changeRoot($baseBeforeRootChange, {'id': $baseType, 'path': $baseType});
                                $assert($base ~> $noDuplicateElements,'Duplicate elements! (tag: 6)');
                                ($applyDifferential($base, $getStructureDefinition($thisProfile).differential.element) ~> $changeRoot($this))[id != $this.id];
                              ) : (
                                ($changeRoot([$allSlicesHead,$thisAllSlicesChildren], $this))[id != $this.id]
                              )
                            ) : (
                              /*    if A's head is mono */
                              $exists($thisProfile) and $not($thisProfile.$startsWith($, 'http://hl7.org/fhirpath/System.')) ? (
                                /*      apply the diff of the profile */
                                $thisProfileDef := $getStructureDefinition($thisProfile);
                                $thisProfileDef.derivation = 'constraint' ? (
                                  $thisProfileDiff := $thisProfileDef.differential.element;
                                  $base := ([
                                    $this,
                                    $changeRoot(
                                      [
                                        $allSlicesHead,
                                        $thisAllSlicesChildren
                                      ], 
                                      $this
                                    )[id != $this.id]
                                  ]~>$changeRoot({'id': $thisProfileDef.type, 'path': $thisProfileDef.type}));
                                  $assert($base ~> $noDuplicateElements,'Duplicate elements! (tag: 7)');
                                  ($applyDifferential($base, $thisProfileDiff)~>$changeRoot($this))[id != $this.id];
                                ) : (
                                  $changeRoot(
                                    [
                                      $allSlicesHead,
                                      $thisAllSlicesChildren
                                    ], 
                                    $this
                                  )[id != $this.id]
                                )
                              ) : (
                                ($changeRoot([$allSlicesHead, $thisAllSlicesChildren], $this))[id != $this.id];
                              )
    
                            )
                            /* TODO: when applying profile diffs, it should be done serially with the whole chain of profiles */
                          )
                          
                        )
                      ) : [];
                      [$this, $childrenToAdd];
                    )
                  )
                )
              );

              $assert($wipSnapshot ~> $noDuplicateElements,'Duplicate elements! (tag: 8)');
    
              /* generate an updated wip object */
              $updatedObj := {
                'wipDifferential': $remainingDiff,
                'profileSnap': $inputObject.profileSnap,
                'wipSnapshot': $wipSnapshot
              };
    
              /* fix changed id's in diff */
              $updatedObj := $fixDiffIds($updatedObj);
    
              /* check if any diffs were applied in this iteration */
              $count($updatedObj.wipDifferential) = $count($inputObject.wipDifferential) ? (
                /* no diffs applied, return results */
                $updatedObj
              ) : (
                /* diffs were applied, run this level again */
                $applyDiffLevel($updatedObj, $level, $originalBase);
              )
            )
          };
    
          $iterate := function($obj, $step, $maxDepth, $base) {(
            
            $assert($obj.wipSnapshot ~> $noDuplicateElements,'Duplicate elements! (tag: 9)');
            
            $nextObj := $applyDiffLevel($obj, $step, $base);
            
            $assert($nextObj.wipSnapshot ~> $noDuplicateElements,'Duplicate elements! (tag: 10)');

            $nextObj.($step >= $maxDepth and ($count(wipDifferential) in [0, $count($obj.wipDifferential)] or $exists(wipDifferential)=false)) ? (
              /* when all diffs were applied, or no change in diffs and we have reached max depth */

              /* throw warning if not all diffs could be applid */
              $remainingDiffs := $nextObj.wipDifferential[id in $diff.id];
              $count($remainingDiffs) > 0 ? (
                $warning('Snapshot generation incomplete, there are differentials that cannot be applied! (' & $join($remainingDiffs.id, ', ') & '). ProfileId: "' & $profileId & '"');
              );
              
              /* and return snapshot */
              $nextObj.wipSnapshot
            ) : (
              /* there are still diffs to apply, */
              /* iterate to the next depth level */

              $nextStep := $step + 1;

              $assert($nextObj.wipSnapshot ~> $noDuplicateElements,'Duplicate elements! (tag: 11)');
              $iterate($nextObj, $nextStep, $maxDepth, $base);
            )
          )};
    
          $assert($base ~> $noDuplicateElements,'Duplicate elements! (tag: 12)');
          
          $wipObject := {
            'wipSnapshot': $base,
            'wipDifferential': $diff,
            'profileSnap': $profileSnapshot
          };
          $maxDepth := $max($diff.($getLevel($)));
          $res := $iterate($wipObject, 1, $maxDepth, $base);

          /* remove contentReference if there's a type */
          $res := $res ~> |$[$exists(type) and $exists(contentReference)]|{},['contentReference']|;
        )};

        $profileDef := $getStructureDefinition($profileId);
        $profileDef.derivation = 'constraint' ? (
          /* it's a profile */
          
          $parentUrl := $profileDef.baseDefinition;
          $parentDef := $getStructureDefinition($parentUrl);
          $parentDef := $getSnapshot($parentUrl);

          $info("Generating snapshot for '" & $profileId & "'");

          $profileSnapshot := (
            /* if it's an HL7 profile, use its existing snapshot for hints about implicit type constraints */
            $startsWith($profileDef.url, 'http://hl7.org/fhir/') ? 
              $profileDef.snapshot.element
          );
          $snapshot := $applyDifferential($parentDef.snapshot.element, $profileDef.differential.element, $profileSnapshot);
          $merge([$profileDef, { 'snapshot': { 'element': [$snapshot] } }]);
        ) : (
          /* it's not a profile - it's a base type - return definition as-is */
          $profileDef;
        )
      )};

      $ss := $generateSnapshot($profileId);
      
      $ss := (/* remove internal proccessing tags from results */
      $ss 
      ~> |*.element|{},['_diffId', '__fromDefinition', '__rootChildren', '__sliceChildren']| 
      ~> $fixMonoPolySlicesSnap);

      $merge([$ss, {'snapshot': { 'element': [$distinct($ss.snapshot.element)]}}]);
    )
  `)
};

const toTitleCase = (str: string) => {
  const firstChar: string = str.charAt(0).toUpperCase();
  const rest: string = str.slice(1);
  const res: string = firstChar + rest;
  return res;
};

const polyNameWithoutX = async (polyId: string) => {
  const polyNameWithoutX: FumifierCompiled = await expressions.polyNameWithoutX;
  const res: string = await polyNameWithoutX.evaluate({}, { polyId });
  return res;
};

const fixMonoPolySlicesIterator = async (diff: any[], depth: number, logger: ILogger) => {
  /* fix a single depth level - used in the $reduce function */
  const fixMonoPolySlicesIterator: FumifierCompiled = await expressions.fixMonoPolySlicesIterator;
  return await fixMonoPolySlicesIterator.evaluate({}, { diff, depth, endsWith, polyNameWithoutX, startsWith, mergeElementDefinition, toTitleCase, omitKeys, info: (msg: any) => logger.info(msg) });
};

const fixMonoPolySlicesDiff = async (def: any, logger: ILogger) => {
  /* for every polymorphoic with a single type, */
  /* merge the diff head element with the slice element */
  const fixMonoPolySlicesDiff: FumifierCompiled = await expressions.fixMonoPolySlicesDiff;
  return await fixMonoPolySlicesDiff.evaluate({}, { def, fixMonoPolySlicesIterator: async (diff: any[], depth: number) => await fixMonoPolySlicesIterator(diff, depth, logger) });
};

const fixMonoPolySlicesSnap = async (def: any, logger: ILogger) => {
  /* for every polymorphoic with a single type, */
  /* merge the diff head element with the slice element */
  return await (await expressions.fixMonoPolySlicesSnap).evaluate({}, { def, fixMonoPolySlicesIterator: async (diff: any[], depth: number) => await fixMonoPolySlicesIterator(diff, depth, logger) });
};

const getStructureDefinition = async (definitionId: string, fhirVersion: string, fhirPackageIndex: IFhirPackageIndex, logger: ILogger) => {
  const rawDef = getRawDefinition(definitionId, fhirVersion, fhirPackageIndex, logger);
  return await fixMonoPolySlicesDiff(rawDef, logger);
};

const isPoly = (element: any) => {
  /* check if an element is polymorphic at its base */
  return element?.id.endsWith('[x]');
};

const polySliceToNamedMonoPoly = async (element: any) => {
  return await (await expressions.polySliceToNamedMonoPoly).evaluate({}, { element, endsWith });
};

const isMonoPoly = (element: any) => {
  /* this function checks if this element is a polymorphic */
  /* base element that has has been limited to a single type */
  return isPoly(element) && element?.type?.length === 1;
};

const toNamedMonoPoly = async (element: any) => {
  /* this function gets an element definition of a mono-poly element */
  /* and returns its id in the shortcut (named type) form: */
  /* valueCode, deceasedBoolean etc. */
  return await (await expressions.toNamedMonoPoly).evaluate({}, { element });
};

const toPolySlice = async (element: any) => {
  /* this function gets an element definition of a mono-poly element */
  /* and returns its id in the long (sliced) form: */
  /* value[x]:valueCode, deceased[x]:deceasedBoolean etc. */
  return await (await expressions.toPolySlice).evaluate({}, { element, toNamedMonoPoly });
};

const isMonoPolyMatch = async (snapElement: any, diffElement: any) => {
  /* returns true if the diff element matches the snapshot one */
  /* according to the mono-poly matching rules */
  return await (await expressions.isMonoPolyMatch).evaluate({}, { snapElement, diffElement, isMonoPoly, toNamedMonoPoly, toPolySlice });
};

const polyToMonoPolies = async (polyElement: any) => {
  /* takes a single polymorphic element and returns an array of monopolies. */
  /* each monopoly returned has only a single type */
  return await (await expressions.polyToMonoPolies).evaluate({}, { polyElement });
};

const isExplicitSlice = async (snapElement: any, diffElement: any) => {
  /* checks if a diff is an explicit slice entry on the snapshot element */
  /* slice entries should have a sliceName and an id that ends with :sliceName */
  return await (await expressions.isExplicitSlice).evaluate({}, { snapElement, diffElement, startsWith });
};

const implicitToExplicitSlice = async (snapElement: any, diffElement: any, logger: ILogger) => {
  /* checks if a diff is an implicit slice on the snapshot element */
  /* and if it is, returns it with the correct id, type and sliceName. */
  /* if it isn't, returns undefined */
  /* this is only relevant for polymorphic snapshot elements */
  return await (await expressions.implicitToExplicitSlice).evaluate({}, { snapElement, diffElement, isPoly, polyToMonoPolies, toNamedMonoPoly, toPolySlice, omitKeys, info: (msg: any) => logger.info(msg) });
};

const mergeElementDefinition = async (arrayOfElements: any | any[], logger: ILogger) => {
  return await (await expressions.mergeElementDefinition).evaluate({}, { arrayOfElements, info: (msg: any) => logger.info(msg) });
};

const fetchSliceEntries = async (snapElement: any, diffArray: any | any[], logger: ILogger) => {
  /* if there are slice entries for this element, return them */
  /* this includes: */
  /* 1. explicit slices */
  /* 2. implicit slices on type($this) under polymorphics */
  const res = await (await expressions.fetchSliceEntries).evaluate({}, { snapElement, diffArray, omitKeys, isExplicitSlice, mergeElementDefinition, implicitToExplicitSlice: async (snapElement: any, diffElement: any) => await implicitToExplicitSlice(snapElement, diffElement, logger), info: (msg: any) => logger.info(msg) });
  return res;
};

const fixDiffIds = async (inputObject: any) => {
  return await (await expressions.fixDiffIds).evaluate({}, { inputObject, startsWith });
};

const fetchDiffElement = async (snapElement: any, diffArray: any | any[], logger: ILogger) => {
  return await (await expressions.fetchDiffElement).evaluate({}, { snapElement, diffArray, isMonoPolyMatch, omitKeys, info: (msg: any) => logger.info(msg), getLastAllSlicesId, mergeElementDefinition, polySliceToNamedMonoPoly });
};

const getLevel = (element: string | any) => {
  const elementId: string = typeof element === 'string' ? element : element?.id;
  if (typeof elementId === 'undefined') {
    return undefined;
  } else {
    return elementId.split('.').length;
  }
};

const removeSliceFromId = async (element: any) => {
  return await (await expressions.removeSliceFromId).evaluate({}, { element, endsWith });
};

const getLastAllSlicesId = async (elementId: string) => {
  return await (await expressions.getLastAllSlicesId).evaluate({}, { elementId });
};

const changeRoot = async (elementArray: any | any[], newRootElement: any) => {
  return await (await expressions.changeRoot).evaluate({}, { elementArray, newRootElement });
};

const noDuplicateElements = async (elementArray: any | any[], logger: ILogger) => {
  return await (await expressions.noDuplicateElements).evaluate({}, { elementArray, info: (msg: any) => logger.info(msg) });
};

const repositionSlices = async (wipSnapshot: any | any[], originalBase: any | any[], level: number, logger: ILogger) => {
  return await (await expressions.repositionSlices).evaluate({}, { wipSnapshot, originalBase, level, noDuplicateElements: async (elementArray: any | any[]) => await noDuplicateElements(elementArray, logger), getSliceEntriesId, getLevel, startsWith, endsWith, info: (msg: any) => logger.info(msg) });
};

const getSliceEntriesId = async (elements: any | any[]) => {
  const res = await (await expressions.getSliceEntriesId).evaluate({}, { elements, endsWith });
  return res;
};

export const generateSnapshot = async (profileId: string, fhirVersion: string, fhirPackageIndex: IFhirPackageIndex, logger: ILogger) => {
  return await (await expressions.generateSnapshot).evaluate({},
    {
      profileId,
      getSliceEntriesId,
      info: (msg: any) => logger.info(msg),
      warning: (msg: any) => logger.warn(msg),
      startsWith,
      endsWith,
      fetchDiffElement: async (snapElement: any, diffArray: any | any[]) => await fetchDiffElement(snapElement, diffArray, logger),
      isPoly,
      mergeElementDefinition,
      fetchSliceEntries: async (snapElement: any, diffArray: any | any[]) => await fetchSliceEntries(snapElement, diffArray, logger),
      getStructureDefinition: async (profileId: string) => await getStructureDefinition(profileId, fhirVersion, fhirPackageIndex, logger),
      changeRoot,
      removeSliceFromId,
      getLevel,
      fixDiffIds,
      noDuplicateElements: async (elementArray: any | any[]) => await noDuplicateElements(elementArray, logger),
      repositionSlices: async (wipSnapshot: any | any[], originalBase: any | any[], level: number) => await repositionSlices(wipSnapshot, originalBase, level, logger),
      getSnapshot: async (profileId: string) => await parser.getSnapshot(profileId, fhirVersion, fhirPackageIndex, logger),
      fixMonoPolySlicesSnap: async (def: any) => await fixMonoPolySlicesSnap(def, logger)
    });
};
