import React from "react";
import { Field, connect, getIn } from "formik";

import { Input, Switch } from "react-cui-2.0";

import { FadeCollapse } from "animations";

import CoABlock from "./CoABlock";

export default connect(({ formik }) => {
  const showBlock = getIn(formik.values, "attributes.radius", true);

  React.useLayoutEffect(() => {
    formik.setFieldValue("auth_port", getIn(formik.values, "auth_port", 1812));
    formik.setFieldValue("acct_port", getIn(formik.values, "acct_port", 1813));
    formik.setFieldValue(
      "attributes.shared",
      getIn(formik.values, "attributes.shared", "")
    );
  }, []);

  React.useEffect(() => {
    if (!showBlock) {
      formik.unregisterField("auth_port");
      formik.unregisterField("acct_port");
      formik.unregisterField("attributes.shared");
      formik.unregisterField("attributes.no_session_action");
      formik.unregisterField("attributes.coa_nak_err_cause");
      formik.unregisterField("attributes.no_session_dm_action");
      formik.unregisterField("attributes.dm_err_cause");
    }
  }, [showBlock]);

  return (
    <FadeCollapse in={showBlock} unmountOnExit>
      <div className="form-group panel no-padding-top panel--bordered-bottom base-margin-bottom base-padding-bottom">
        <div className="row">
          <div className="col">
            <Field
              component={Input}
              type="number"
              name="auth_port"
              label="Authentication port"
              min={1}
              max={65535}
            />
          </div>
          <div className="col">
            <Field
              component={Input}
              type="number"
              name="acct_port"
              label="Accounting port"
              min={1}
              max={65535}
            />
          </div>
        </div>
        <Field
          component={Input}
          type="text"
          name="attributes.shared"
          label="Shared secret"
          validate={(v) => {
            if (!v) return "Shared secret must be specified";
            return undefined;
          }}
        />
        <Field
          component={Switch}
          name="coa"
          right="Handle Dynamic Authorization (RFC3576)"
        />
        <CoABlock />
      </div>
    </FadeCollapse>
  );
});
