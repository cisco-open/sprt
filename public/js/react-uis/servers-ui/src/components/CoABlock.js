import React from "react";
import { Field, connect, getIn } from "formik";

import { Select } from "react-cui-2.0";
import Divider from "var-builder/FieldDivider";

import { FadeCollapse } from "animations";

const ErrorCauses = [
  <optgroup label="Successful completion" key="successful">
    <option value="201">201 - Residual Session Context Removed</option>
    <option value="202">202 - Invalid EAP Packet (Ignored)</option>
  </optgroup>,
  <optgroup
    label="Fatal errors committed by the RADIUS server"
    key="server-fatal"
  >
    <option value="401">401 - Unsupported Attribute</option>
    <option value="402">402 - Missing Attribute</option>
    <option value="403">403 - NAS Identification Mismatch</option>
    <option value="404">404 - Invalid Request</option>
    <option value="405">405 - Unsupported Service</option>
    <option value="406">406 - Unsupported Extension</option>
    <option value="407">407 - Invalid Attribute Value</option>
  </optgroup>,
  <optgroup label="Fatal errors occurring on a NAS" key="nas-fatal">
    <option value="501">501 - Administratively Prohibited</option>
    <option value="502">502 - Request Not Routable (Proxy)</option>
    <option value="503">503 - Session Context Not Found</option>
    <option value="504">504 - Session Context Not Removable</option>
    <option value="505">505 - Other Proxy Processing Error</option>
    <option value="506">506 - Resources Unavailable</option>
    <option value="507">507 - Request Initiated</option>
    <option value="508">508 - Multiple Session Selection Unsupported</option>
  </optgroup>,
  <optgroup label="Other" key="other">
    <option value="000">Don&apos;t send Error-Cause</option>
  </optgroup>,
];

export default connect(({ formik }) => {
  const showBlock = Boolean(getIn(formik.values, "coa", 1));

  React.useLayoutEffect(() => {
    formik.setFieldValue(
      "attributes.no_session_action",
      getIn(formik.values, "attributes.no_session_action", "coa-nak")
    );
    formik.setFieldValue(
      "attributes.coa_nak_err_cause",
      getIn(formik.values, "attributes.coa_nak_err_cause", "503")
    );
    formik.setFieldValue(
      "attributes.no_session_dm_action",
      getIn(formik.values, "attributes.no_session_dm_action", "disconnect-nak")
    );
    formik.setFieldValue(
      "attributes.dm_err_cause",
      getIn(formik.values, "attributes.dm_err_cause", "503")
    );
  }, []);

  React.useEffect(() => {
    if (!showBlock) {
      formik.unregisterField("attributes.no_session_action");
      formik.unregisterField("attributes.coa_nak_err_cause");
      formik.unregisterField("attributes.no_session_dm_action");
      formik.unregisterField("attributes.dm_err_cause");
    }
  }, [showBlock]);

  return (
    <FadeCollapse in={showBlock} unmountOnExit>
      <div className="half-margin-top">
        <Divider
          f={{ grouper: "If session not found on CoA-Request", accent: true }}
        />
        <Field
          name="attributes.no_session_action"
          component={Select}
          title="Action"
          prompt="Select action"
        >
          <option value="coa-ack" key="coa-ack">
            CoA-ACK
          </option>
          <option value="coa-nak" key="coa-nak">
            CoA-NAK
          </option>
          <option value="drop" key="drop">
            Drop
          </option>
        </Field>
        <Field
          name="attributes.coa_nak_err_cause"
          component={Select}
          title="Error-Cause"
          prompt="Select"
        >
          {ErrorCauses}
        </Field>
        <Divider
          f={{
            grouper: "If session not found on Disconnect-Request",
            accent: true,
          }}
        />
        <Field
          name="attributes.no_session_dm_action"
          component={Select}
          title="Action if session not found on Disconnect-Request"
          prompt="Select action"
        >
          <option value="disconnect-ack" key="disconnect-ack">
            Disconnect-ACK
          </option>
          <option value="disconnect-nak" key="disconnect-nak">
            Disconnect-NAK
          </option>
          <option value="drop" key="drop">
            Drop
          </option>
        </Field>
        <Field
          name="attributes.dm_err_cause"
          component={Select}
          title="Error-Cause"
          prompt="Select"
        >
          {ErrorCauses}
        </Field>
      </div>
    </FadeCollapse>
  );
});
