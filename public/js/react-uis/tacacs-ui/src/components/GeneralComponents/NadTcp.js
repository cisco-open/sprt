import React from "react";
import { Field, useFormikContext } from "formik";

import { Input } from "react-cui-2.0";

import { OptionsContext } from "../../contexts";

const NadTcp = () => {
  const options = React.useContext(OptionsContext);
  const { setFieldValue } = useFormikContext();

  React.useEffect(() => {
    setFieldValue("nad.timeout", options.nad.timeout || 5, false);
    setFieldValue("nad.retries", options.nad.retries || 0, false);
  }, []);

  return (
    <>
      <div className="row form-group--margin">
        <div className="col">
          <Field
            component={Input}
            type="number"
            name="nad.timeout"
            label={
              <>
                {"Timeout "}
                <span className="text-xsmall">(seconds)</span>
              </>
            }
            min="1"
            max="600"
          />
        </div>
        <div className="col">
          <Field
            component={Input}
            type="number"
            name="nad.retries"
            label="Retries"
            min="0"
            max="100"
          />
        </div>
      </div>
    </>
  );
};

export default NadTcp;
