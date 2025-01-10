import React from "react";
import { Field, getIn, useFormikContext } from "formik";

import { Input, InputChips } from "react-cui-2.0";

import { OptionsContext } from "../../contexts";

import ServerLoad from "./ServerLoad";

const Server = () => {
  const options = React.useContext(OptionsContext);
  const { setFieldValue } = useFormikContext();

  React.useEffect(() => {
    setFieldValue(
      "server.address",
      getIn(options, "server.address", ""),
      false
    );
    setFieldValue("server.ports", getIn(options, "server.ports", [49]), false);
    setFieldValue("server.secret", getIn(options, "server.secret", ""), false);
  }, []);

  return (
    <>
      <div className="flex base-margin-top half-margin-bottom">
        <h2 className="half-margin-right flex-center-vertical no-margin-bottom display-3 text-capitalize">
          Server
        </h2>
        <ServerLoad />
      </div>
      <div className="panel-body">
        <Field
          component={Input}
          type="text"
          name="server.address"
          label="Server address"
          validate={(value) => {
            let error;
            if (!value) {
              error = "Server address must be specified";
            }
            return error;
          }}
        />
        <Field
          component={InputChips}
          name="server.ports"
          chipsColor="info"
          allowRegex="^\d+$"
          delimiters={[13, 32, 188]}
          valueValidator={(v) => {
            v = parseInt(v, 10);
            return v > 0 && v <= 65535 ? v : false;
          }}
          maxChips={4}
          label={
            <>
              {"Ports "}
              <span className="text-xsmall">(up to 4)</span>
            </>
          }
          baloon="Random port for new connection."
          validate={(value) => {
            let error;
            if (value && !value.length) {
              error = "At least one port must be specified";
            }
            return error;
          }}
        />
        <Field
          component={Input}
          type="text"
          name="server.secret"
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
    </>
  );
};

export default Server;
