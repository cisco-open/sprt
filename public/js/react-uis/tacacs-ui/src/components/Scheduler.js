import React from "react";
import { connect, getIn } from "formik";

import { VariantSelectorFormik } from "my-composed/VariantSelectorFormik";
import { Alert } from "react-cui-2.0";

import { JobSchedule } from "../../../scheduler-ui/src/components/JobSchedule";

export default connect(({ formik }) => {
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
