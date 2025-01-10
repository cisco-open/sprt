import React from "react";
import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";
import { Formik, Field, Form, connect, getIn } from "formik";

import {
  Alert,
  Spinner as Loader,
  toast,
  Button,
  Switch,
  Select,
  Input,
} from "react-cui-2.0";
import { ErrorDetails } from "my-utils";
import { Fade } from "animations";

import { getHealth, putHealth } from "../actions";
import { HealthContext } from "../contexts";

const HideableForm = connect(({ formik }) => {
  return (
    <Fade
      in={getIn(formik.values, "enabled", false)}
      mountOnEnter
      unmountOnExit
    >
      <div className="section">
        Auto-cleanup will run everyday at
        <Field
          component={Select}
          name="hour"
          inline="both"
          title={null}
          prompt="Hour"
          id="hour"
          className="qtr-margin-left qtr-margin-right no-margin-top"
        >
          {Array.from(
            new Array(24),
            (_, index) => `${(index + 1).toString().padStart(2, "0")}:00`
          ).map((h) => (
            <option id={h} value={h} key={h}>
              {h}
            </option>
          ))}
        </Field>
        and will remove all sessions which are older than
        <Field
          component={Input}
          className="qtr-margin-left qtr-margin-right no-margin-top"
          name="days"
          type="number"
          min={1}
          max={365}
          inline="both"
        />
        days.
      </div>
    </Fade>
  );
});

const findDays = (cmd) => {
  const matches = cmd.match(/cleaner.+-d\s+(\d+)/);
  return matches && matches.length >= 2 ? parseInt(matches[1], 10) : 5;
};

const DisplaySettings = ({ result }) => {
  const { triggerHealthUpdate } = React.useContext(HealthContext);

  return (
    <div className="animated fadeIn">
      <h2 className="display-3 no-margin-top text-capitalize flex-fluid">
        Settings
      </h2>
      <Formik
        initialValues={{
          enabled: Boolean(Array.isArray(result) && result.length),
          hour:
            Array.isArray(result) && result.length
              ? `${result[0].hour}:00`
              : "23:00",
          days:
            Array.isArray(result) && result.length
              ? findDays(result[0].command)
              : 5,
        }}
        onSubmit={async (values, actions) => {
          try {
            await putHealth({ what: "settings", data: values });
            toast.success("Saved", "Changes saved");
            actions.setSubmitting(false);
            triggerHealthUpdate("settings");
          } catch (e) {
            actions.setSubmitting(false);
            toast.error("Operation failed", e.message);
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <Field
              component={Switch}
              name="enabled"
              right="Enable auto-cleanups of outdated sessions"
            />
            <HideableForm />
            <div className="section">
              <Button.Success type="submit" disabled={isSubmitting}>
                Save
                {isSubmitting ? (
                  <span className="icon-animation spin qtr-margin-left" />
                ) : null}
              </Button.Success>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export const Settings = () => {
  const {
    updateTrigger: { settings: trigger },
  } = React.useContext(HealthContext);
  const loadState = useAsync({
    promiseFn: getHealth,
    what: "settings",
    full: true,
    watch: trigger,
  });

  return (
    <div className="animated fadeIn section no-padding">
      <IfPending state={loadState}>
        <Loader />
      </IfPending>
      <IfRejected state={loadState}>
        {(error) => (
          <Alert type="error" title="Operation failed">
            {"Couldn't get data: "}
            {error.message}
            <ErrorDetails error={error} />
          </Alert>
        )}
      </IfRejected>
      <IfFulfilled state={loadState}>
        {({ result }) => <DisplaySettings result={result} />}
      </IfFulfilled>
    </div>
  );
};
