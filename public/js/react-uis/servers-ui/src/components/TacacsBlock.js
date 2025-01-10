import React from "react";
import { Field, connect, getIn } from "formik";

import { Input, InputChips } from "react-cui-2.0";

import { FadeCollapse } from "animations";

export default connect(({ formik }) => {
  const showBlock = getIn(formik.values, "attributes.tacacs", false);

  React.useEffect(() => {
    formik.setFieldValue(
      "attributes.tac.ports",
      getIn(formik.values, "attributes.tac.ports", [49])
    );
    formik.setFieldValue(
      "attributes.tac.shared",
      getIn(formik.values, "attributes.tac.shared", "")
    );
  }, []);

  React.useEffect(() => {
    if (!showBlock) {
      formik.unregisterField("attributes.tac.ports");
      formik.unregisterField("attributes.tac.shared");
    }
  }, [showBlock]);

  return (
    <FadeCollapse in={showBlock} unmountOnExit>
      <div className="form-group panel no-padding-top">
        <Field
          component={InputChips}
          name="attributes.tac.ports"
          chipsColor="info"
          allowRegex="^\d+$"
          delimiters={[13, 32, 188]}
          valueValidator={(v) => {
            v = parseInt(v);
            return v > 0 && v <= 65535 ? v : false;
          }}
          maxChips={4}
          label={
            <>
              Ports <span className="text-xsmall">(up to 4)</span>
            </>
          }
          baloon="Ports will be used in round-robin. New port for new connection."
          validate={(value) => {
            let error;
            if (!value.length) {
              error = "At least one port must be specified";
            }
            return error;
          }}
        />
        <Field
          component={Input}
          type="text"
          name="attributes.tac.shared"
          label="Shared secret"
          validate={(value) => {
            let error;
            if (!value) {
              error = "Shared secret must be specified";
            }
            return error;
          }}
        />
      </div>
    </FadeCollapse>
  );
});
