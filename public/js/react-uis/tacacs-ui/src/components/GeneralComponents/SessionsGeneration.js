import React from "react";
import { connect, Field, getIn, useFormikContext } from "formik";

import Fade from "animations/Fade";

import { Input, Switch } from "react-cui-2.0";

import { OptionsContext } from "../../contexts";

import OptionsSectionHeader from "../common/OptionsSectionHeader";

const Amount = () => {
  const options = React.useContext(OptionsContext);
  const { values, setFieldValue } = useFormikContext();
  const [rOnly, setROnly] = React.useState(
    getIn(values, "auth.credentials.limit_sessions", false)
  );

  React.useEffect(() => {
    const v = getIn(values, "auth.credentials.limit_sessions", false);

    if (v) setFieldValue("generation.amount", "auto", false);
    else
      setFieldValue(
        "generation.amount",
        getIn(options, "generation.amount", 1),
        false
      );

    setROnly(v);
  }, [getIn(values, "auth.credentials.limit_sessions", false)]);

  if (rOnly)
    return (
      <Field
        component={Input}
        type="text"
        name="generation.amount"
        label={
          <>
            {"Amount of sessions "}
            <span className="text-xsmall">
              {`(up to ${getIn(options, "generation.max_amount", 100000)})`}
            </span>
          </>
        }
        readOnly="readonly"
      />
    );
  return (
    <Field
      component={Input}
      type="number"
      name="generation.amount"
      label={
        <>
          {"Amount of sessions "}
          <span className="text-xsmall">
            {`(up to ${getIn(options, "generation.max_amount", 100000)})`}
          </span>
        </>
      }
      min={1}
      max={getIn(options, "generation.max_amount", 100000)}
      validate={(v) => {
        let error;
        if (!v) error = "Amount of sessions is required";
        return error;
      }}
    />
  );
};

const SaveSessions = () => {
  const options = React.useContext(OptionsContext);
  const { values, setFieldValue } = useFormikContext();

  React.useEffect(() => {
    setFieldValue(
      "generation.save",
      getIn(options, "generation.save", true),
      false
    );
    setFieldValue(
      "generation.bulk",
      getIn(options, "generation.bulk", ""),
      false
    );
  }, []);

  return (
    <>
      <Field component={Switch} name="generation.save" right="Save sessions" />
      <Fade
        in={Boolean(getIn(values, "generation.save", true))}
        mountOnEnter
        unmountOnExit
        appear
      >
        <Field
          component={Input}
          type="text"
          name="generation.bulk"
          label="Bulk name"
        />
      </Fade>
    </>
  );
};

const SessionsGeneration = () => {
  const options = React.useContext(OptionsContext);
  const { setFieldValue } = useFormikContext();

  React.useEffect(() => {
    setFieldValue(
      "generation.job_name",
      getIn(options, "generation.job_name", ""),
      false
    );
    setFieldValue(
      "generation.latency",
      getIn(options, "generation.latency", 0),
      false
    );
    setFieldValue(
      "generation.async",
      getIn(options, "generation.async", false),
      false
    );
  }, []);

  return (
    <>
      <OptionsSectionHeader title="Sessions Generation" />
      <div className="panel-body">
        <Field
          component={Input}
          type="text"
          name="generation.job_name"
          label="Job name"
          validate={(val) => {
            let error;
            if (val && !/^[a-z\d_]+$/i.test(val))
              error =
                "Only the following symbols are allowed for job name: a-z, 0-9, _";
            return error;
          }}
        />
        <Amount />
        <Field
          component={Input}
          type="text"
          name="generation.latency"
          label={
            <>
              {"Latency between sessions "}
              <span className="text-xsmall">(milliseconds)</span>
            </>
          }
          baloon="Can be integer or range in format 'N1..N2'. If range is specified, random number will be used from the range."
          validate={(v) => {
            if (!/^\d+$/.test(v) && !/^\d+[.]{2}\d+$/.test(v)) {
              return "Incorrect value";
            }
            return undefined;
          }}
        />
        <SaveSessions />
        <Field
          component={Switch}
          name="generation.async"
          right="Multi-thread generation"
        />
      </div>
    </>
  );
};

export default connect(SessionsGeneration);
