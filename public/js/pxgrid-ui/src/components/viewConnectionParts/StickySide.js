import React from "react";
import { connect } from "react-redux";
import { Modal, ModalBody, ModalFooter, toast } from "react-cui-2.0";

import { refreshConnectionState, disconnectWS } from "../../actions";
import { Panel, Button } from "../cui";
import history from "../../history";

class StickySide extends React.Component {
  state = { stateRefreshing: false, disconnecting: false, modal: null };

  onStateRefresh = async () => {
    this.setState({ stateRefreshing: true });

    try {
      await this.props.refreshConnectionState(this.props.connection.id);
      toast("info", "Completed", "State refreshed");
    } catch (e) {
      toast(
        "error",
        e.response.data.error || "Operation Failed",
        e.response.data.message || e.message
      );
    } finally {
      this.setState({ stateRefreshing: false });
    }
  };

  onWSDisconnect = async () => {
    this.setState({ disconnecting: true });

    try {
      await this.props.disconnectWS(this.props.connection.id);
      toast("info", "Completed", "Disconnected");
    } catch (e) {
      toast(
        "error",
        e.response.data.error || "Operation Failed",
        e.response.data.message || e.message
      );
    } finally {
      this.setState({ disconnecting: false });
    }
  };

  setModal = () => {
    const { credentials } = this.props.connection;
    switch (credentials.type) {
      case "password":
        this.setState({
          modal: (
            <dl className="dl--inline-wrap dl--inline-centered">
              <dt>Nodename:</dt>
              <dd>{credentials.nodename}</dd>
              <dt>Password:</dt>
              <dd>{credentials.password}</dd>
            </dl>
          ),
        });
        return;
      case "certificate":
        this.setState({
          modal: (
            <Panel well border color="ltgray">
              <pre className="text-monospace">{credentials.certificate}</pre>
            </Panel>
          ),
        });
        return;
      default:
        return;
    }
  };

  renderCredentials = () => {
    const { credentials } = this.props.connection;

    return (
      <>
        <dt>Auth method</dt>
        <dd className="flex">
          <div className="flex-fill">
            {credentials.type.charAt(0).toUpperCase() +
              credentials.type.slice(1)}
          </div>
          <a className="qtr-margin-left" onClick={this.setModal}>
            <span className="icon-eye" title="View" />
          </a>
        </dd>
      </>
    );
  };

  renderModal = () => {
    const { modal } = this.state;

    if (!modal) {
      return null;
    }

    return (
      <Modal
        isOpen={Boolean(modal)}
        size="large"
        closeIcon
        closeHandle={() => this.setState({ modal: null })}
        autoClose
        title="Authentication data"
      >
        <ModalBody className="text-left">{modal || null}</ModalBody>
        <ModalFooter>
          <Button
            color="secondary"
            onClick={() => this.setState({ modal: null })}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>
    );
  };

  render() {
    const { connection, children } = this.props;
    const { stateRefreshing } = this.state;

    const stateColor = () => {
      switch (connection.attributes.state) {
        case "ENABLED":
          return " text-success";
        case "PENDING":
          return " text-warning";
        default:
          return " text-default";
      }
    };

    const ws = () => {
      const { connected, to } = connection.wsConnection;
      const { disconnecting } = this.state;
      if (typeof connected === "undefined") {
        return null;
      }

      return (
        <>
          <dt>WebSockets</dt>
          <dd>
            {connected ? (
              <div className="flex">
                <div className="flex-fill">
                  {"Connected to "}
                  <span className="text-darkgreen text-normal">{to}</span>
                </div>
                <a
                  onClick={this.onWSDisconnect}
                  title="Disconnect"
                  disabled={disconnecting}
                >
                  <span
                    className={
                      disconnecting ? "icon-animation spin" : "icon-link-broken"
                    }
                  />
                </a>
              </div>
            ) : (
              "Not connected"
            )}
          </dd>
        </>
      );
    };

    return (
      <div className="position-sticky base-sticky-top">
        <Panel border="right,bottom">
          <h4 className="text-uppercase">{connection.friendlyName}</h4>
          <dl>
            <dt>Client name</dt>
            <dd>{connection.clientName}</dd>
            <dt>State</dt>
            <dd className="flex">
              <div className={`flex-fill${stateColor()}`}>
                {connection.attributes.state}
              </div>
              <a
                onClick={this.onStateRefresh}
                title="Refresh"
                disabled={stateRefreshing}
              >
                <span className={`icon-refresh ${stateRefreshing && "spin"}`} />
              </a>
            </dd>
            {this.renderCredentials()}
            <dt>Nodes</dt>
            <dd>
              {[
                connection.primary.fqdn,
                ...(connection.secondaries.fqdns || []),
              ].map((h) => (
                <div key={h}>{h}</div>
              ))}
            </dd>
            {ws()}
          </dl>
        </Panel>
        {children}
        <a
          className="half-margin-left base-margin-top"
          onClick={() => history.push("/pxgrid/")}
        >
          <span className="icon-arrow-left-tail qtr-margin-right" />
          Back to Consumers
        </a>
        {this.renderModal()}
      </div>
    );
  }
}

export default connect(null, { refreshConnectionState, disconnectWS })(
  StickySide
);
