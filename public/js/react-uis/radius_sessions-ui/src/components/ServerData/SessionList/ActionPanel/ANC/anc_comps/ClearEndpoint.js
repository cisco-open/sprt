import React from "react";
import PropTypes from "prop-types";
import { useFormikContext } from "formik";
import { PolicySelector } from "./PolicySelector";
import { OperationResponse } from "./OperationResponse";

import { SessionContext } from "../anc_contexts";
import { clearEndpointByIp, clearEndpointByMac } from "../anc_actions";

export const ClearEndpoint = ({ by }) => {
  const {
    values: { connection },
    setFieldValue,
    setFieldTouched,
  } = useFormikContext();
  const { mac, ipAddr: ip } = React.useContext(SessionContext);
  const [applying, setApplying] = React.useState(false);
  const [response, setResponse] = React.useState(null);

  React.useEffect(() => {
    setFieldValue(by, by === "mac" ? mac : ip, false);
    setFieldTouched(by, true, false);
  }, []);

  if (connection) {
    const applyCallback = async (policy) => {
      try {
        setApplying(true);
        setResponse(null);
        let r;
        if (by === "ip") {
          r = await clearEndpointByIp(connection, ip, policy);
        } else {
          r = await clearEndpointByMac(connection, mac, policy);
        }
        setResponse(r);
      } catch (error) {
        setResponse({ error });
      } finally {
        setApplying(false);
      }
    };

    return (
      <>
        <PolicySelector
          applyCallback={applyCallback}
          applying={applying}
          applyText={["Clear", "Clearing"]}
        />
        <OperationResponse response={response} />
      </>
    );
  }

  return null;
};

ClearEndpoint.propTypes = {
  by: PropTypes.oneOf(["ip", "mac"]).isRequired,
};
