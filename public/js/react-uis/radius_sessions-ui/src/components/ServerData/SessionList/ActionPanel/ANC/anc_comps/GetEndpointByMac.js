import React from "react";
import { getIn, useFormikContext } from "formik";

import { Alert, Spinner as Loader } from "react-cui-2.0";

import AlertRefresh, { Refresh } from "./AlertRefresh";
import { fetchGetEndpointByMac, fetchGetPolicyByName } from "../anc_actions";

import {
  SessionContext,
  MethodsContext,
  BlockerContext,
} from "../anc_contexts";

const PolicyDetails = ({ policyName }) => {
  const {
    values: { connection },
  } = useFormikContext();
  const [policy, setPolicy] = React.useState({});
  const [loading, setLoading] = React.useState(false);

  const fetchPolicy = async () => {
    setLoading(true);
    try {
      setPolicy(await fetchGetPolicyByName(connection, policyName));
    } catch (error) {
      setPolicy({ error });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPolicy();
  }, []);

  if (policy && Object.keys(policy).length) {
    return (
      <>
        <dt>Actions</dt>
        <dd>
          {policy.error ? (
            <span className="text-danger">
              {"getPolicyByName call failed: "}
              {getIn(
                policy.error,
                "response.data.message",
                policy.error.message
              )}
            </span>
          ) : (
            policy.actions.join(", ")
          )}
        </dd>
      </>
    );
  }
  return (
    <>
      <dt>Actions</dt>
      <dd>{loading ? "Loading details..." : "No data"}</dd>
    </>
  );
};

export const GetEndpointByMac = () => {
  const { mac } = React.useContext(SessionContext);
  const { setBlocked } = React.useContext(MethodsContext);
  const blocked = React.useContext(BlockerContext);
  const {
    values: { connection },
  } = useFormikContext();

  const [policies, setPolicies] = React.useState({});

  const fetchEpPolicies = async () => {
    setBlocked(true);
    try {
      setPolicies(await fetchGetEndpointByMac(connection, mac));
    } catch (error) {
      setPolicies({ error });
    } finally {
      setBlocked(false);
    }
  };

  React.useEffect(() => {
    if (!connection) return;

    fetchEpPolicies();
  }, [connection]);

  if (blocked) return <Loader />;

  if (connection) {
    if (policies && Object.keys(policies).length) {
      if (policies.error) {
        return (
          <Alert type="error" title="Operation failed">
            {"getEndpointByMac call failed: "}
            {getIn(
              policies.error,
              "response.data.message",
              policies.error.message
            )}
          </Alert>
        );
      }

      return (
        <div className="panel panel--bordered half-margin-top">
          <h4>Policy Details</h4>
          <dl className="dl--inline-wrap half-margin-bottom">
            <dt>Name</dt>
            <dd>{policies.policyName}</dd>
            <PolicyDetails policyName={policies.policyName} />
          </dl>
          <Refresh refresh={fetchEpPolicies} />
        </div>
      );
    }
    return (
      <AlertRefresh title="No policies applied" refresh={fetchEpPolicies}>
        <p>{`No policies applied to the EP ${mac}.`}</p>
      </AlertRefresh>
    );
  }

  return null;
};
