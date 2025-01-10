import React from "react";

import OptionsSectionHeader from "./common/OptionsSectionHeader";
import { connect } from "formik";

import Sets from "./CommandsComponents/Sets";

const Commands = () => (
  <div className="section section--compressed">
    <OptionsSectionHeader title="Command Sets" />
    <div className="panel-body">
      <Sets />
    </div>
  </div>
);

export default connect(Commands);
