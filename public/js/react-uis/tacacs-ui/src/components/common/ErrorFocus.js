import React from "react";
import { connect, useFormikContext } from "formik";
import { useHistory } from "react-router-dom";

const flattenObject = ob => {
  const toReturn = {};

  Object.keys(ob).forEach(i => {
    if (typeof ob[i] === "object") {
      const flatObject = flattenObject(ob[i]);
      Object.keys(flatObject).forEach(x => {
        toReturn[`${i}.${x}`] = flatObject[x];
      });
    } else {
      toReturn[i] = ob[i];
    }
  });
  return toReturn;
};

const ErrorFocus = ({ tabs }) => {
  const history = useHistory();
  const {
    isSubmitting,
    isValidating,
    errors,
    setSubmitting
  } = useFormikContext();

  React.useEffect(() => {
    if (Object.keys(errors).length > 0 && isSubmitting && !isValidating) {
      const flatten = Object.keys(flattenObject(errors));
      tabs.every(tab =>
        tab.mapping.every(rx =>
          flatten.every(v => {
            if (rx.test(v)) {
              history.push(tab.link);
              setSubmitting(false);
              return false;
            }
            return true;
          })
        )
      );
    }
  }, [isSubmitting, isValidating, errors]);

  return null;
};

export default connect(ErrorFocus);
