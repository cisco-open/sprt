import React from "react";
import { connect, Field, getIn } from "formik";

import { Select, Alert } from "react-cui-2.0";

import { OptionsContext } from "../../contexts";

const InfoWrap = ({ children }) => (
  <div className="form-group fadeIn fastest">
    <Alert.Info>{children}</Alert.Info>
  </div>
);

const Info = ({ how }) => {
  switch (how) {
    case "random":
      return (
        <InfoWrap key="random">
          Random set will be used if authentication succeeded.
        </InfoWrap>
      );
    case "one-by-one":
      return (
        <InfoWrap key="one-by-one">
          Next set in order will be used if authentication succeeded.
          <br />
          For example:
          <br />
          UserA authenticated - Set 1 used
          <br />
          UserB failed - no sets used
          <br />
          UserC authenticated - Set 2 used
        </InfoWrap>
      );
    default:
      return null;
  }
};

const HowToSelect = ({ formik }) => {
  const options = React.useContext(OptionsContext);

  React.useEffect(() => {
    formik.setFieldValue(
      "commands.how",
      getIn(options, "commands.how", "random"),
      false
    );
  }, []);

  return (
    <>
      <Field
        name="commands.how"
        component={Select}
        title="How to use command sets"
        prompt="Select"
        id="commands-how"
        className="fadeIn fastest"
      >
        <option id="random" value="random">
          Randomly
        </option>
        <option id="one-by-one" value="one-by-one">
          In configured order
        </option>
      </Field>
      <Info how={getIn(formik.values, "commands.how")} />
    </>
  );
};

export default connect(HowToSelect);
