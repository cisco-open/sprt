import React from "react";
import { connect } from "react-redux";
import Moment from "react-moment";
import "moment-timezone";
import { ConfirmationModal, Button } from "react-cui-2.0";

import { Loader, Panel, TabPane } from "../cui";
import { fetchLogs, clearLogs } from "../../actions";

class LogsPagination extends React.Component {
  state = { modal: false };

  renderDeleteModal() {
    return (
      <ConfirmationModal
        isOpen
        confirmHandle={() => this.props.clearLogs(this.props.connectionId)}
        closeHandle={() => this.setState({ modal: false })}
        prompt={<>Are you sure you want to delete all logs?</>}
        confirmType="danger"
        confirmText="Delete"
        autoClose
      />
    );
  }

  render() {
    const { loading, blocked, connectionId } = this.props;

    return (
      <div
        className="flex qtr-padding-top qtr-padding-bottom"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: "var(--cui-background-color)",
        }}
      >
        <div className="flex-fill flex-center-vertical">
          <div className="btn-group btn-group--square">
            <Button
              color="light"
              disabled={blocked || loading}
              onClick={() => this.props.fetchLogs(connectionId)}
            >
              <span
                className={`${
                  loading ? "icon-animation spin" : "icon-refresh"
                } qtr-margin-right`}
              />
              Refresh
            </Button>
            <Button
              color="light"
              disabled={blocked || loading}
              onClick={() => this.setState({ modal: true })}
            >
              <span className="icon-trash qtr-margin-right" />
              Clear
            </Button>
          </div>
        </div>
        {this.state.modal && this.renderDeleteModal()}
      </div>
    );
  }
}

LogsPagination = connect(undefined, { clearLogs, fetchLogs })(LogsPagination);

class LogsTab extends React.Component {
  componentDidMount = async () => {
    this.props.fetchLogs(this.props.match.params.id);
  };

  renderLoader = () => {
    return <Loader text="Loading logs..." />;
  };

  levelColor = (level) => {
    switch (level) {
      case "emerg":
      case "alert":
      case "crit":
      case "error":
        return "text-danger";
      case "warning":
        return "text-warning";
      case "debug":
        return "text-muted";
      case "notice":
      case "info":
      default:
        return "text-info";
    }
  };

  renderLogs = () => {
    const {
      logs,
      blocked,
      loading,
      match: {
        params: { id },
      },
    } = this.props;

    if (!logs.length) {
      return "No logs yet.";
    }

    return (
      <>
        <LogsPagination blocked={blocked} loading={loading} connectionId={id} />
        <pre
          style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word" }}
          className="text-monospace half-margin-top half-margin-bottom"
        >
          {logs.map((log) => (
            <p
              key={`log-${log.id}`}
              style={{ textIndent: "-2em", margin: "-0 1em 0 3em" }}
            >
              <Moment>{log.timestamp}</Moment>
              {": "}
              <span className={`${this.levelColor(log.level)} text-uppercase`}>
                {`${log.level}:`.padEnd("8", " ")}
              </span>
              <span className="text-darkgreen text-normal">
                {log.label}
                {": "}
              </span>
              {log.message}
            </p>
          ))}
        </pre>
      </>
    );
  };

  render() {
    const { loading } = this.props;

    return (
      <TabPane active>
        <Panel noPadding="top">
          <h3 className="display-4 no-margin-bottom">Logs</h3>
          <div className="section" style={{ position: "relative" }}>
            {loading ? this.renderLoader() : this.renderLogs()}
          </div>
        </Panel>
      </TabPane>
    );
  }
}

export default connect(
  (state) => {
    const { logs } = state;
    const props = {
      logs,
      blocked: false,
      loading: false,
    };
    if (logs.length === 1 && typeof logs[0] === "string") {
      switch (logs[0]) {
        case "loading":
          props.loading = true;
          break;
        case "blocked":
          props.blocked = true;
          break;
      }
    }
    return props;
  },
  { fetchLogs, clearLogs }
)(LogsTab);
