import React from "react";
import { connect, Field, getIn } from "formik";

import { Alert, Input } from "react-cui-2.0";
import { VariantSelectorFormik } from "my-composed/VariantSelectorFormik";
import Fade from "animations/Fade";

import { OptionsContext } from "../../../contexts";

const Random = connect(({ formik }) => {
  const options = React.useContext(OptionsContext);

  React.useEffect(() => {
    formik.setFieldValue(
      "auth.attributes.chpass_how.min-length",
      getIn(options, "auth.attributes.chpass_how.min-length", 8),
      false
    );
    formik.setFieldValue(
      "auth.attributes.chpass_how.max-length",
      getIn(options, "auth.attributes.chpass_how.max-length", 12),
      false
    );

    return () => {
      formik.unregisterField("auth.attributes.chpass_how.min-length");
      formik.setFieldValue(
        "auth.attributes.chpass_how.min-length",
        undefined,
        false
      );
      formik.unregisterField("auth.attributes.chpass_how.max-length");
      formik.setFieldValue(
        "auth.attributes.chpass_how.max-length",
        undefined,
        false
      );
    };
  }, []);

  return (
    <>
      <div className="row">
        <div className="col">
          <Field
            component={Input}
            type="number"
            name="auth.attributes.chpass_how.min-length"
            label="Min length"
            validate={(v) => {
              if (
                v >
                getIn(formik.values, "auth.attributes.chpass_how.max-length")
              )
                return "Min length cannot be greater than max length";
              return;
            }}
            min="1"
            max="64"
          />
        </div>
        <div className="col">
          <Field
            component={Input}
            type="number"
            name="auth.attributes.chpass_how.max-length"
            label="Max length"
            validate={(v) => {
              if (
                v <
                getIn(formik.values, "auth.attributes.chpass_how.min-length")
              )
                return "Max length cannot be less than min length";
              return;
            }}
            min="1"
            max="64"
          />
        </div>
      </div>
      <Alert.Info className="half-margin-top">
        You'll find new password on TACACS sessions page
      </Alert.Info>
    </>
  );
});

const Specify = connect(({ formik }) => {
  const options = React.useContext(OptionsContext);

  React.useEffect(() => {
    formik.setFieldValue(
      "auth.attributes.chpass_how.value",
      getIn(options, "auth.attributes.chpass_how.min-length", ""),
      false
    );

    return () => {
      formik.unregisterField("auth.attributes.chpass_how.value");
      formik.setFieldValue(
        "auth.attributes.chpass_how.value",
        undefined,
        false
      );
    };
  }, []);

  return (
    <Field
      component={Input}
      type="text"
      name="auth.attributes.chpass_how.value"
      label="Password"
    />
  );
});

const ChPass = ({ formik, method }) => {
  const options = React.useContext(OptionsContext);

  React.useEffect(() => {
    formik.setFieldValue(
      "auth.attributes.chpass",
      getIn(options, "auth.attributes.chpass", undefined),
      false
    );
  }, []);

  return (
    <Fade in={method === "ascii"} mountOnEnter unmountOnExit>
      <VariantSelectorFormik
        variants={[
          {
            variant: "random",
            display: "Random",
            component: (
              <div className="tab animated fadeIn fast active-tab" key="random">
                <Random />
              </div>
            ),
          },
          {
            variant: "static",
            display: "Specified",
            component: (
              <div className="tab animated fadeIn fast active-tab" key="static">
                <Specify />
              </div>
            ),
          },
        ]}
        varPrefix="auth.attributes.chpass"
        title="Change password"
        disableable
        enableTitleAppend=", how: "
      />
    </Fade>
  );
};

export default connect(ChPass);
