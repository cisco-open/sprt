import React from "react";
import { Field, useFormikContext } from "formik";

import { Select, Alert, Spinner as Loader } from "react-cui-2.0";

import AlertRefresh, { Refresh } from "./AlertRefresh";
import { fetchGetPolicies } from "../anc_actions";

import { MethodsContext, BlockerContext } from "../anc_contexts";

const PolicySelect = ({ policies, ...props }) => {
  const blocked = React.useContext(BlockerContext);

  if (blocked) props.disabled = true;

  React.useEffect(() => {
    return () => {
      props.form.setFieldValue("policy", "", false);
    };
  }, []);

  return (
    <Select
      title="Policy"
      prompt="Select policy"
      id="policy-selector"
      {...props}
    >
      {policies.map((pol) => (
        <option id={pol.name} value={pol.name} key={pol.name}>
          {`${pol.name} (actions: ${pol.actions.join("; ")})`}
        </option>
      ))}
    </Select>
  );
};

const ApplyPolicyBtn = ({ applyCallback, applying, applyText, policy }) => {
  const opts = {};
  if (applying) opts.disabled = "disabled";
  if (!applyText || !Array.isArray(applyText))
    applyText = ["Apply", "Applying"];

  return (
    <a className="form-group" onClick={() => applyCallback(policy)} {...opts}>
      <span className="flex-center-vertical">
        {applying ? applyText[1] : applyText[0]}
        <span
          className={`half-margin-left ${
            applying ? "icon-animation spin" : "icon-check"
          }`}
        />
      </span>
    </a>
  );
};

export const PolicySelector = ({ applyCallback, applying, applyText }) => {
  const {
    values: { connection },
  } = useFormikContext();
  const { setBlocked } = React.useContext(MethodsContext);
  const blocked = React.useContext(BlockerContext);

  const [policies, setPolicies] = React.useState({});
  const [selected, setSelected] = React.useState("");

  const fetchPolicies = async () => {
    setSelected("");
    setBlocked(true);
    try {
      const r = await fetchGetPolicies(connection);
      setPolicies(r);
    } catch (error) {
      setPolicies({ error });
    } finally {
      setBlocked(false);
    }
  };

  const validatePolicy = (v) => {
    if (v && v !== selected) setSelected(v);
  };

  React.useEffect(() => {
    if (!connection) return;

    fetchPolicies();
  }, [connection]);

  if (blocked) {
    return <Loader />;
  }

  if (policies && Object.keys(policies).length) {
    if (policies.error) {
      return (
        <Alert type="error" title="Operation failed">
          {"getPolicies call failed: "}
          {policies.error.message}
        </Alert>
      );
    }

    return (
      <>
        <Field
          component={PolicySelect}
          name="policy"
          policies={policies.policies}
          validate={validatePolicy}
        />
        <div className="half-margin-top flex-center-vertical flex">
          <Refresh refresh={fetchPolicies} formGroup />
          {selected && (
            <>
              <div className="divider" />
              <ApplyPolicyBtn
                applyCallback={applyCallback}
                applying={applying}
                policy={selected}
                applyText={applyText}
              />
            </>
          )}
        </div>
      </>
    );
  }
  return (
    <AlertRefresh title="No policies" refresh={fetchPolicies}>
      <p>No policies configured.</p>
    </AlertRefresh>
  );
};
