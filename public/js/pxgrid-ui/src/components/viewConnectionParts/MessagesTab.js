import React from "react";
import { connect } from "react-redux";
import ReactJsonTree from "react-json-tree";
import Moment from "react-moment";
import "moment-timezone";

import {
  Modal,
  ModalBody,
  ModalFooter,
  ConfirmationModal,
  Label,
  Button,
  Panel,
} from "react-cui-2.0";

import { fetchMessages, markMessageRead, deleteMessage } from "../../actions";
import {
  Dropdown,
  base16Theme,
  Pagination,
  Loader,
  toast,
  TabPane,
} from "../cui";
import { copyStringToClipboard } from "../../utils/functions";

class Message extends React.Component {
  state = { modal: false, deleteConfirmation: false, blocked: false };

  componentDidMount = async () => {
    if (!this.props.data.viewed) {
      setTimeout(this.markMeRead, 1000);
    }
  };

  markMeRead = async () => {
    const {
      connection,
      data: { id },
    } = this.props;
    try {
      await this.props.markMessageRead(id, connection);
    } catch (e) {
      console.error(e);
    }
  };

  onCopyClick = () => {
    const { message } = this.props.data;
    copyStringToClipboard(JSON.stringify(message, null, 2));
    toast("info", "", "Message copied to clipboard");
  };

  onCloseModal = () => {
    this.setState({ modal: false, deleteConfirmation: false });
  };

  onDeleteClick = async () => {
    this.setState({ deleteConfirmation: false, blocked: true });
    const {
      connection,
      data: { id },
    } = this.props;
    try {
      await this.props.deleteMessage(id, connection);
      toast("success", "Message deleted");
    } catch (e) {
      toast(
        "error",
        e.response.data.error || "Operation Failed",
        e.response.data.message || e.message
      );
      this.setState({ blocked: false });
    }
  };

  renderDeleteModal() {
    if (!this.state.deleteConfirmation) {
      return null;
    }
    return (
      <ConfirmationModal
        isOpen={this.state.deleteConfirmation}
        confirmHandle={() => this.onDeleteClick(true)}
        closeHandle={this.onCloseModal}
        prompt={<>Are you sure you want to delete the message?</>}
        confirmType="danger"
        confirmText="Delete"
        autoClose
      />
    );
  }

  renderModal = () => {
    if (!this.state.modal) {
      return null;
    }
    return (
      <Modal
        isOpen={this.state.modal}
        size="large"
        closeIcon
        closeHandle={this.onCloseModal}
        autoClose
        title="Message"
      >
        <ModalBody className="text-left">
          <div className="text-monospace">
            <ReactJsonTree
              data={this.props.data.message}
              theme={{
                ...base16Theme,
                base00: "var(--cui-background-inactive)",
              }}
              invertTheme={false}
              hideRoot
              shouldExpandNode={(_keyName, _data, level) => level <= 1}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.onCopyClick}>
            Copy to clipboard
          </Button>
          <Button color="light" onClick={this.onCloseModal}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    );
  };

  render() {
    const {
      style,
      innerRef,
      data: { topic, message, timestamp, viewed },
    } = this.props;

    return (
      <>
        <Panel ref={innerRef} style={{ ...style, cursor: "pointer" }}>
          <div className="flex">
            <div
              className="labels flex-fill"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              onClick={() => this.setState({ modal: true })}
            >
              <Label color="light" className="qtr-margin-right" size="tiny">
                <Moment>{timestamp}</Moment>
              </Label>
              <Label color="primary" className="qtr-margin-right" size="tiny">
                {topic}
              </Label>
              {!viewed && (
                <Label color="info" size="tiny" className="qtr-margin-right">
                  new
                </Label>
              )}
              {JSON.stringify(message)}
            </div>
            <div
              className="action-icons half-margin-left"
              style={{ whiteSpace: "nowrap" }}
            >
              <a onClick={this.onCopyClick}>
                <span
                  className="icon-clipboard qtr-margin-right"
                  title="Copy as text"
                />
              </a>
              <a onClick={() => this.setState({ deleteConfirmation: true })}>
                <span className="icon-trash" title="Delete" />
              </a>
            </div>
          </div>
        </Panel>
        {this.renderModal()}
        {this.renderDeleteModal()}
      </>
    );
  }
}

Message = connect(undefined, { markMessageRead, deleteMessage })(Message);

class MessagesList extends React.Component {
  state = { lastUnread: 0 };

  shouldComponentUpdate = (nextProps, nextState) => {
    const unread = parseInt(nextProps.unread);

    if (
      this.state.lastUnread !== unread &&
      nextState.lastUnread !== unread &&
      parseInt(this.props.unread) !== unread
    ) {
      this.props.fetchMessages(
        this.props.connectionId,
        this.props.position,
        this.props.perPage
      );
    }
    return Boolean(
      nextProps.messages !== this.props.messages || nextProps.loadingMessages
    );
  };

  componentDidUpdate = () => {
    const unread = parseInt(this.props.unread);
    if (this.state.lastUnread != unread) {
      this.setState({ lastUnread: unread });
    }
  };

  renderLoader = () => <Loader text="Loading messages..." />;

  renderOverlay = () => {
    const { loadingMessages } = this.props;
    if (!loadingMessages) {
      return null;
    }

    return (
      <div
        className="load-overlay flex"
        style={{
          width: "100%",
          height: "100%",
          top: "0",
          left: "0",
        }}
      >
        <Loader text={false} />
      </div>
    );
  };

  renderMessages = () => {
    if (this.props.total <= 0) {
      return "No messages yet, try to subscribe for any topic first";
    }

    return (
      <div style={{ position: "relative" }}>
        {this.props.messages.map((msg) => (
          <Message
            data={msg}
            connection={this.props.connectionId}
            key={`message-${msg.id}`}
          />
        ))}
        {this.renderOverlay()}
      </div>
    );
  };

  render() {
    const { isLoading } = this.props;
    return isLoading ? this.renderLoader() : this.renderMessages();
  }
}

MessagesList = connect(
  (state, ownProps) => {
    const {
      messages: { messages, total, position, perPage, loading },
    } = state;
    const connection = state.connections.find(
      (c) => c.id === ownProps.connectionId
    );
    return {
      isLoading: Array.isArray(messages) && messages[0] === "loading",
      loadingMessages: loading,
      messages,
      total,
      position,
      perPage,
      connectionId: ownProps.connectionId,
      unread: connection.messages.unread,
    };
  },
  { fetchMessages }
)(MessagesList);

const DeleteActionButton = (props) => (
  <Button color="light" disabled={props.loading} onClick={props.clicked}>
    <span className="icon-trash qtr-margin-right" />
    Clear
  </Button>
);

const RefreshActionButton = (props) => (
  <Button color="light" disabled={props.loading} onClick={props.clicked}>
    <span
      className={`${
        props.loading ? "icon-animation spin" : "icon-refresh"
      } qtr-margin-right`}
    />
    Refresh
  </Button>
);

class MessagesPagination extends React.Component {
  state = { deleteConfirmation: false, blocked: false };

  changePage = async (event, position) => {
    // this.setState({ loading: true });
    try {
      await this.props.fetchMessages(
        this.props.connectionId,
        position,
        this.props.perPage
      );
      // this.setState({ position });
    } catch (e) {
      toast(
        "error",
        e.response.data.error || "Operation Failed",
        e.response.data.message || e.message
      );
    }
    // this.setState({ loading: false });
  };

  changePerPage = async (event, newPerPage) => {
    try {
      await this.props.fetchMessages(
        this.props.connectionId,
        this.props.position,
        newPerPage
      );
    } catch (e) {
      toast(
        "error",
        e.response.data.error || "Operation Failed",
        e.response.data.message || e.message
      );
    }
  };

  onDeleteClick = async () => {
    this.setState({ deleteConfirmation: false, blocked: true });

    try {
      await this.props.deleteMessage("all", this.props.connectionId);
      toast("success", "Message deleted");
    } catch (e) {
      toast(
        "error",
        e.response.data.error || "Operation Failed",
        e.response.data.message || e.message
      );
      this.setState({ blocked: false });
    }
  };

  renderDeleteModal() {
    if (!this.state.deleteConfirmation) {
      return null;
    }
    return (
      <ConfirmationModal
        isOpen={this.state.deleteConfirmation}
        confirmHandle={() => this.onDeleteClick(true)}
        closeHandle={() =>
          this.setState({ deleteConfirmation: false, blocked: false })
        }
        prompt={<>Are you sure you want to delete all messages?</>}
        confirmType="danger"
        confirmText="Delete"
        autoClose
      />
    );
  }

  renderPerPage = () => {
    const { perPage } = this.props;

    return [10, 25, 50, 100, 250, 500].map((v) => (
      <a
        onClick={(e) => this.changePerPage(e, v)}
        key={`per-page-${v}`}
        className={perPage === v ? "selected" : ""}
      >
        {v}
      </a>
    ));
  };

  renderActions = () => {
    const { loading } = this.props;
    const { blocked } = this.state;
    return (
      <div className="btn-group btn-group--square">
        <RefreshActionButton
          loading={loading}
          clicked={(e) => this.changePage(e, this.props.position)}
        />
        <DeleteActionButton
          loading={loading || blocked}
          clicked={() => this.setState({ deleteConfirmation: true })}
        />
        {this.renderDeleteModal()}
      </div>
    );
  };

  render() {
    const { position, perPage, total } = this.props;

    if (total <= 0) {
      return null;
    }

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
          {this.renderActions()}
        </div>
        <div className="flex-center-vertical">
          <span className="qtr-margin-right">Page:</span>
          <Pagination
            size="small"
            icons
            position={position}
            total={total}
            perPage={perPage}
            onPageChange={this.changePage}
            firstAndLast={false}
            className="no-margin"
          />
          <div className="v-separator v-separator--large" />
          <span className="qtr-margin-right">Per page:</span>
          <Dropdown
            type="link"
            header={`${perPage}`}
            alwaysClose
            openTo="left"
            className="half-padding-left half-margin-right"
          >
            {this.renderPerPage()}
          </Dropdown>
        </div>
      </div>
    );
  }
}

MessagesPagination = connect(
  (state) => {
    const { total, position, perPage, loading } = state.messages;
    return { total, position, perPage, loading };
  },
  { fetchMessages, deleteMessage }
)(MessagesPagination);

export default class MessagesTab extends React.Component {
  componentDidMount = async () => {
    try {
      await this.props.fetchMessages(this.props.match.params.id);
    } catch (e) {
      toast(
        "error",
        e.response.data.error || "Operation Failed",
        e.response.data.message || e.message
      );
    }
  };

  render() {
    return (
      <TabPane active>
        <Panel>
          <h3 className="display-4 no-margin-bottom">Messages</h3>
          <div className="section" style={{ position: "relative" }}>
            <MessagesPagination connectionId={this.props.match.params.id} />
            <MessagesList connectionId={this.props.match.params.id} />
          </div>
        </Panel>
      </TabPane>
    );
  }
}

MessagesTab = connect(undefined, { fetchMessages })(MessagesTab);
