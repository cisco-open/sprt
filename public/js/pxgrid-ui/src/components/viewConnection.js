import React from "react";
import { connect } from "react-redux";
import { Route, Switch } from "react-router-dom";
import { ConfirmationModal, toast } from "react-cui-2.0";

import { fetchConnections, deleteConnection } from "../actions";
import history from "../history";
import { Loader, Tabs, Tab, Alert } from "./cui";
import { FadeDiv } from "./posedComponents";

import StickySide from "./viewConnectionParts/StickySide";
import ServicesTab from "./viewConnectionParts/ServicesTab";
import TopicsTab from "./viewConnectionParts/TopicsTab";
import MessagesTab from "./viewConnectionParts/MessagesTab";
import LogsTab from "./viewConnectionParts/LogsTab";

/**
 * Main view component
 */

class ViewConnection extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: null,
      deleteConfirmation: null,
    };
  }

  componentDidMount = async () => {
    if (!this.props.connection) {
      await this.props.fetchConnections();
    }
  };

  onDeleteClick = async (confirmed) => {
    if (!confirmed) {
      this.setState({ deleteConfirmation: true });
    } else {
      this.setState({ deleteConfirmation: false, blocked: true });
      try {
        await this.props.deleteConnection(this.props.connection.actions.delete);
        toast("success", "Connection deleted");
        history.push("/pxgrid/");
      } catch (e) {
        this.setState({ blocked: false });
        toast(
          "error",
          e.response.data.error || "Operation Failed",
          e.response.data.message || e.message
        );
      }
    }
  };

  handleCloseModal = () => {
    this.setState({ deleteConfirmation: false });
  };

  onTabChange = (activeTab) => {
    history.push(
      `/pxgrid/connections/${this.props.match.params.id}/${activeTab}`
    );
  };

  onNewMessages = () => {};

  renderDeleteModal() {
    if (!this.state.deleteConfirmation) return null;

    return (
      <ConfirmationModal
        isOpen={this.state.deleteConfirmation}
        confirmHandle={() => this.onDeleteClick(true)}
        closeHandle={this.handleCloseModal}
        prompt={
          <>
            {"Are you sure you want to delete connection "}
            <strong>{this.props.connection.title}</strong>?
          </>
        }
        confirmType="danger"
        confirmText="Delete"
        autoClose
      />
    );
  }

  renderTabs = () => {
    const tabs = [
      {
        title: "Services",
        regex: new RegExp("/pxgrid/connections/[^/]+/services"),
        name: "services",
      },
      {
        title: "Topics",
        regex: new RegExp("/pxgrid/connections/[^/]+/topics"),
        name: "topics",
      },
      {
        title: "Messages",
        regex: new RegExp("/pxgrid/connections/[^/]+/messages"),
        name: "messages",
        // badge: <MessageBadge connection={this.props.connection} />
      },
      {
        title: "Logs",
        regex: new RegExp("/pxgrid/connections/[^/]+/logs"),
        name: "logs",
      },
    ];

    return tabs.map(({ title, regex, name, badge }) => (
      <Tab
        key={name}
        title={title}
        active={regex.test(window.location.href)}
        tabName={name}
        badged
      >
        {typeof badge !== "undefined" && badge}
      </Tab>
    ));
  };

  render() {
    if (!this.props.connection) return <Loader text="Loading..." />;

    // const { activeTab } = this.state;
    const { connection } = this.props;
    const connPart =
      "/pxgrid/connections/:id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})";
    return (
      <FadeDiv key="connection-data" className="row">
        <div className="col-md-4 col-lg-3" style={{ position: "relative" }}>
          <StickySide connection={connection}>
            <Tabs onTabChange={this.onTabChange} vertical>
              {this.renderTabs()}
            </Tabs>
          </StickySide>
        </div>
        <div className="col-md-8 col-lg-9">
          <div className="base-margin-bottom base-margin-top tab-content">
            {connection.attributes.state !== "ENABLED" && (
              <Alert
                type="warning"
                className="base-margin-bottom half-margin-right half-margin-left"
              >
                This client connection is not yet created/approved. Please
                refresh state first and approve on ISE if needed.
              </Alert>
            )}
            <Switch>
              <Route path={`${connPart}/services`} component={ServicesTab} />
              <Route path={`${connPart}/topics`} component={TopicsTab} />
              <Route path={`${connPart}/messages`} component={MessagesTab} />
              <Route path={`${connPart}/logs`} component={LogsTab} />
            </Switch>
          </div>
        </div>
        {this.renderDeleteModal()}
      </FadeDiv>
    );
  }
}

export default connect(
  (state, ownProps) => {
    const connection = state.connections.find(
      (c) => c.id === ownProps.match.params.id
    );
    return { connection };
  },
  { fetchConnections, deleteConnection }
)(ViewConnection);
