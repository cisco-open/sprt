import React from "react";

import Portal from "portal";
import { Formik, connect, getIn } from "formik";

import { ToastContainer, Alert } from "react-cui-2.0";
import { VariantSelectorFormik } from "my-composed/VariantSelectorFormik";

import { JobSchedule } from "./JobSchedule";
import { UpdateSchedule } from "./UpdateSchedule";
import { objToCron } from "./CronSchedule";

const TIME_MAPPER = {
  "Seconds since creation": "timeFromCreate",
  "Seconds since last change": "timeFromChange",
};

const flatAttributes = (attributes) => attributes.map(attributesWalker).flat();

const attributesWalker = ({ value, name, values }) =>
  typeof value !== "undefined" && name
    ? {
        value:
          name === "Acct-Session-Time"
            ? TIME_MAPPER[value]
              ? TIME_MAPPER[value]
              : value
            : value,
        name,
      }
    : flatAttributes(values);

const Scheduler = connect(({ formik }) => {
  const collectData = () => {
    let v = formik.values.scheduler;
    const jCron = getIn(v, "job.cron", undefined);
    if (jCron) {
      v = {
        ...v,
        job: { ...v.job, cron: { ...v.job.cron, cron_line: objToCron(jCron) } },
      };
    }

    const attributes = getIn(v, "updates.attributes", undefined);
    if (Array.isArray(attributes) && attributes.length) {
      v = {
        ...v,
        updates: {
          ...v.updates,
          attributes: flatAttributes(attributes),
        },
      };
    }
    return v;
  };

  const validateData = async () => {
    const errors = await formik.validateForm();
    return Object.keys(errors).length === 0;
  };

  if (registerCollector && typeof registerCollector === "function") {
    registerCollector("scheduler", collectData, validateData);
  }

  return (
    <>
      <VariantSelectorFormik
        variants={[
          {
            variant: "none",
            display: "Nothing",
            component: null,
          },
          {
            variant: "job",
            display: "Job itself",
            component: <JobSchedule />,
          },
          {
            variant: "updates",
            display: "Interim updates",
            component: <UpdateSchedule />,
          },
        ]}
        varPrefix="scheduler"
        title="What should be scheduled:"
      />
      {getIn(formik.values, "scheduler.variant", "none") !== "none" ? (
        <Alert.Info className="animated faster fadeIn">
          Schedule will be added after the job finished
        </Alert.Info>
      ) : null}
    </>
  );
});

export default () => {
  return (
    <>
      <h2 className="display-3 no-margin half-margin-bottom text-capitalize flex-fluid">
        Scheduler
      </h2>
      <div className="panel-body collector-no-submit" id="collector-scheduler">
        <Formik
          initialValues={{ scheduler: { variant: "none" } }}
          validate={() => {}}
          onSubmit={() => {}}
        >
          {() => <Scheduler />}
        </Formik>
      </div>
      <Portal id="toast-portal">
        <ToastContainer />
      </Portal>
    </>
  );
};
