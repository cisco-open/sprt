import React from "react";
import { Field, connect, getIn } from "formik";

import { Input, Select } from "react-cui-2.0";
import { VariantSelectorFormik } from "my-composed/VariantSelectorFormik";

import { ByCron } from "./CronSchedule";

const RepeatJob = connect(({ formik }) => {
  React.useEffect(() => {
    formik.setFieldValue(
      "scheduler.job.times",
      getIn(formik.values, "scheduler.job.times", 1),
      false
    );
    formik.setFieldValue(
      "scheduler.job.wait",
      getIn(formik.values, "scheduler.job.wait", 0),
      false
    );
    formik.setFieldValue(
      "scheduler.job.units",
      getIn(formik.values, "scheduler.job.units", "seconds"),
      false
    );

    return () => {
      formik.setFieldValue("scheduler.job.times", undefined, false);
      formik.unregisterField("scheduler.job.times");
      formik.setFieldValue("scheduler.job.wait", undefined, false);
      formik.unregisterField("scheduler.job.wait");
      formik.setFieldValue("scheduler.job.units", undefined, false);
      formik.unregisterField("scheduler.job.units");
    };
  }, []);

  return (
    <div className="animated fadeIn fast">
      <div className="half-margin-bottom">
        Job should be repeated for
        <Field
          component={Input}
          className="qtr-margin-left qtr-margin-right no-margin-top"
          name="scheduler.job.times"
          type="number"
          min={-1}
          max={1000}
          inline="both"
          validate={(v) => {
            if (Number.isNaN(parseInt(v, 10))) return "Required";
            if (parseInt(v, 10) < -1 || parseInt(v, 10) > 1000)
              return "Incorrect";
            return undefined;
          }}
        />
        {'times. Enter "-1" to repeat until stopped '}
        <strong>manually</strong>.
      </div>
      <div className="half-margin-bottom">
        Wait for
        <Field
          component={Input}
          className="qtr-margin-left no-margin-top"
          name="scheduler.job.wait"
          type="number"
          min={0}
          max={10000}
          inline="both"
          validate={(v) => {
            if (Number.isNaN(parseInt(v, 10))) return "Required";
            if (parseInt(v, 10) < 0 || parseInt(v, 10) > 10000)
              return "Incorrect";
            return undefined;
          }}
        />
        <Field
          component={Select}
          name="scheduler.job.units"
          inline="both"
          title={null}
          prompt="Unit"
          id="scheduler.job.units"
          className="qtr-margin-left qtr-margin-right no-margin-top"
        >
          {["seconds", "minutes", "hours", "days"].map((h) => (
            <option id={h} value={h} key={h}>
              {h}
            </option>
          ))}
        </Field>
        {" between repeats"}
      </div>
    </div>
  );
});

export const JobSchedule = connect(({ formik }) => {
  React.useEffect(() => {
    formik.setFieldValue(
      "scheduler.job.variant",
      getIn(formik.values, "scheduler.job.variant", "repeat"),
      false
    );

    return () => {
      formik.setFieldValue("scheduler.job.variant", undefined, false);
      formik.unregisterField("scheduler.job.variant");
    };
  }, []);

  return (
    <div className="tab animated fadeIn fast active-tab">
      <VariantSelectorFormik
        variants={[
          {
            variant: "repeat",
            display: "Repeated once finished",
            component: <RepeatJob />,
          },
          {
            variant: "cron",
            display: "By schedule",
            component: <ByCron prefix="scheduler.job.cron" />,
          },
        ]}
        varPrefix="scheduler.job"
        title="How job should be scheduled:"
      />
    </div>
  );
});
