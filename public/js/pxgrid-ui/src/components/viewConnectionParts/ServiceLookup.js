import React from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { toast } from "react-cui-2.0";

import { makeServicesREST } from "../../actions";
import { Button } from "../cui";
import { FadeDiv } from "../posedComponents";

export default class ServiceLookup extends React.Component {
  state = { busy: false };

  onButtonClick = async () => {
    this.setState({ busy: true });
    const { connection, service } = this.props;

    try {
      await this.props.makeServicesREST(
        connection,
        service,
        "ServiceLookup",
        {}
      );
      toast("success", "Call executed");
    } catch (e) {
      toast(
        "error",
        e.response.data.error || "Operation Failed",
        e.response.data.message || e.message
      );
    } finally {
      this.setState({ busy: false });
    }
  };

  render() {
    const { busy } = this.state;
    const { type, title } = this.props;

    const renderTitle = () => (
      <>
        <span className={busy ? "half-margin-right " : ""}>{title}</span>
        {busy && <span className="icon-animation spin" />}
      </>
    );

    return (
      <FadeDiv key="service-lookup" className="section">
        {type === "button" && (
          <Button
            color="secondary"
            onClick={this.onButtonClick}
            disabled={busy}
          >
            {renderTitle()}
          </Button>
        )}
        {type === "link" && (
          <a
            className={`link ${busy && "disabled"}`}
            onClick={this.onButtonClick}
          >
            {renderTitle()}
          </a>
        )}
      </FadeDiv>
    );
  }
}

ServiceLookup.propTypes = {
  type: PropTypes.oneOf(["link", "button"]),
  title: PropTypes.string,
};

ServiceLookup.defaultProps = {
  type: "button",
  title: "Service Lookup",
};

ServiceLookup = connect(null, { makeServicesREST })(ServiceLookup);
