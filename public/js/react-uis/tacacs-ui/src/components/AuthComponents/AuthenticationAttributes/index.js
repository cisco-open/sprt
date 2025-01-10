import React from "react";
import { connect, getIn } from "formik";

import OptionsSectionHeader from "../../common/OptionsSectionHeader";
import AuthMethod from "./AuthMethod";
import AuthOptions from "./AuthOptions";
import Service from "./Service";
import PrivilegeLevel from "./PrivilegeLevel";
import Port from "./Port";
import ChPass from "./ChPass";

const attributes = connect(({ formik }) => (
  <>
    <OptionsSectionHeader title="Authentication" />
    <div className="panel-body">
      <AuthMethod />
      <AuthOptions method={getIn(formik.values, "auth.method")} />
      <PrivilegeLevel />
      <Service />
      <Port />
      <ChPass method={getIn(formik.values, "auth.method")} />
    </div>
  </>
));

export default attributes;
