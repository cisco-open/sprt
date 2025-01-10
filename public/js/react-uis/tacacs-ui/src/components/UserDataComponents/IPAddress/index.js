import React from "react";
import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";
import { connect, Field, getIn } from "formik";

import { Spinner as Loader, Alert } from "react-cui-2.0";
import { loadAttribute } from "my-actions";
import Variable from "var-builder";
import OptionsSectionHeader from "../../common/OptionsSectionHeader";
import { OptionsContext } from "../../../contexts";

const ipaddress = connect(({ formik }) => {
  const options = React.useContext(OptionsContext);
  const loadingState = useAsync({
    promiseFn: loadAttribute,
    attribute: "ip",
  });

  React.useEffect(() => {
    formik.setFieldValue("auth.ip", getIn(options, "auth.ip", false), false);
  }, []);

  return (
    <>
      <div className="base-margin-top">
        <OptionsSectionHeader
          title="IP Address"
          marginBottom={false}
          subTitle="Address indicating the remote location from which the user has connected to the client."
        />
      </div>
      <div className="panel-body">
        <IfPending state={loadingState}>
          <Loader text="Fetching data..." />
        </IfPending>
        <IfRejected state={loadingState}>
          {(error) => (
            <Alert type="error" title="Operation failed">
              {`Couldn't get IP options: ${error.message}`}
            </Alert>
          )}
        </IfRejected>
        <IfFulfilled state={loadingState}>
          {({ parameters }) => (
            <Field
              name="auth.ip"
              component={Variable}
              data={[{ ...parameters[0], name: undefined }]}
            />
          )}
        </IfFulfilled>
      </div>
    </>
  );
});

export default ipaddress;
