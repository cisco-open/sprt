/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
import React, { Component } from "react";
import posed, { PoseGroup } from "react-pose";
import { connect } from "react-redux";

import { Panel, ConfirmationModal, toast } from "react-cui-2.0";

import { fetchConnections, deleteConnection } from "../actions";
import history from "../history";
import { Loader } from "./cui";
import { PosedH2, Container } from "./posedComponents";

const Card = posed(Panel)({
  enter: { x: 0, opacity: 1 },
  exit: { x: 50, opacity: 0 },
});

class ConnectionCard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      deleteConfirmation: false,
      blocked: false,
    };
  }

  cardClicked = () => {
    if (this.state.blocked) return;

    history.push(`/pxgrid${this.props.connection.link}`);
  };

  onDeleteClick = async (confirmed) => {
    if (!confirmed) {
      this.setState({ deleteConfirmation: true });
    } else {
      this.setState({ deleteConfirmation: false, blocked: true });
      try {
        await this.props.deleteConnection(
          `/pxgrid${this.props.connection.actions.delete}`
        );
        toast("success", "Connection deleted");
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

  renderDeleteModal() {
    if (!this.state.deleteConfirmation) {
      return null;
    }

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
        autoClose={false}
      />
    );
  }

  renderBlock() {
    return (
      <div className="card--overlay animated fadeIn fastest">
        <Loader text={false} />
      </div>
    );
  }

  renderAddCard() {
    const card = this.props.connection;

    return (
      <Card
        onClick={(e) => this.cardClicked(e)}
        bordered
        className="flex-always half-margin hover-emboss--medium"
        padding="loose"
      >
        <div className="flex flex-center flex-middle" style={{ flex: 1 }}>
          <div>
            <h4 className={card.centered ? "text-center" : ""}>
              {card.icon ? <span className={card.icon} /> : null}
              {card.title ? <div>card.title</div> : null}
            </h4>
            {card.text}
          </div>
        </div>
        {/* {this.renderActions()} */}
      </Card>
    );
  }

  renderCard() {
    const { connection } = this.props;
    const { connected } = connection.wsConnection;

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

    return (
      <>
        <Card
          onClick={(e) => this.cardClicked(e)}
          align={connection.centered ? "centered" : "left"}
          bordered
          className="flex flex-column half-margin hover-emboss--medium"
          padding="loose"
        >
          <div className="flex">
            <div className="subtitle text-ellipsis text-wrap-normal flex-fill">
              {connection.title}
            </div>
            <a
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                this.onDeleteClick(false);
              }}
              title="Delete connection"
              className="qtr-margin-left"
            >
              <span className="icon-delete" />
            </a>
          </div>
          <div className="section no-padding-bottom flex-grow-1">
            {connection.icon ? <span className={connection.icon} /> : null}
            <div>
              <Panel
                className="no-padding-left no-padding-right"
                padding="compressed"
              >
                State:
                <span className={`half-margin-left ${stateColor()}`}>
                  {connection.attributes.state}
                </span>
              </Panel>
              <Panel
                className="no-padding-left no-padding-right"
                padding="compressed"
              >
                WebSockets:
                <span
                  className={`half-margin-left ${
                    connected ? "text-success" : "text-warning"
                  }`}
                >
                  {connected ? "UP" : "DOWN"}
                </span>
              </Panel>
            </div>
          </div>
          {this.state.blocked ? this.renderBlock() : null}
        </Card>
        {this.renderDeleteModal()}
      </>
    );
  }

  render() {
    if (this.props.connection.id === "__new-connection") {
      return this.renderAddCard();
    }
    return this.renderCard();
  }
}

ConnectionCard = connect(undefined, { deleteConnection })(ConnectionCard);
export { ConnectionCard };

class ConnectionCardList extends Component {
  async componentDidMount() {
    try {
      await this.props.fetchConnections();
    } catch (e) {
      toast(
        "error",
        e.response.data.error || "Operation Failed",
        e.response.data.message || e.message
      );
    }
  }

  render() {
    const { connections } = this.props;
    if (!connections || !connections.length) {
      return <Loader text="Loading connections..." />;
    }

    return (
      <PoseGroup animateOnMount>
        <PosedH2
          key="consumers-h"
          className="display-3 no-margin text-capitalize"
        >
          Consumers
        </PosedH2>
        <Container
          key="CardList"
          className="grid grid--5up grid--selectable base-margin-bottom"
        >
          {connections.map((el) => (
            <ConnectionCard key={el.id} connection={el} />
          ))}
        </Container>
      </PoseGroup>
    );
  }
}

export default connect(
  (state) => {
    return { connections: state.connections, selected: state.selected };
  },
  { fetchConnections }
)(ConnectionCardList);
