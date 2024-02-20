import jsonata from 'jsonata';

const isEmptyExpr = jsonata(`(
    $exists($value)?(
      $typeOfValue := $type($value);
      $typeOfValue != 'null' ? (
        $typeOfValue != 'string' ? (
          $typeOfValue = 'object' ? (
            $value = {} ? (
              true
              ):(
                /* check all keys of object */
                $boolean($value.*)?false:true;
              )
          ):(
            $typeOfValue = 'array' ? (
              $value = [] ? (
                true
              ):(
                /* check all array values */
              $boolean($value)?false:true
              )
            ):(
              $typeOfValue = 'number' ? (
                false /* a number is regarded as non-empty */
              ):(
                $typeOfValue = 'boolean' ? (
                  false /* boolean is regarded as non-empty */
                ):(
                  true /* type is a function, regarded as empty */
                )
              )
            )
          )
        ):(
          false
        )
      ):true;
    ):true;    
  )`);

export const isEmpty = async (value) => {
  // fork: os
  const res = isEmptyExpr.evaluate({}, { value });
  return await res;
};
