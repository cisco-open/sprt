import React from "react";
import { connect } from "react-redux";
import { Field, reduxForm } from "redux-form";
import { Modal, ModalBody, ModalFooter, Label, toast } from "react-cui-2.0";

import { makeServicesREST } from "../../actions";
import { Textarea, Button } from "../cui";

let TopicPublish = ({ topic, onClose, handleSubmit }) => (
  <Modal closeIcon closeHandle={onClose} title="Publish to topic" isOpen>
    <ModalBody>
      <form onSubmit={handleSubmit}>
        <Field
          component={Textarea}
          id="data"
          name="data"
          rows={20}
          label={
            <>
              {"Enter the data to be sent on "}
              <strong>{topic}</strong>
            </>
          }
        />
      </form>
    </ModalBody>
    <ModalFooter>
      <Button color="white" onClick={onClose}>
        Close
      </Button>
      <Button color="success" onClick={handleSubmit}>
        Send
      </Button>
    </ModalFooter>
  </Modal>
);

TopicPublish = connect(null, { makeServicesREST })(TopicPublish);

TopicPublish = reduxForm({
  form: "publishForm",
})(TopicPublish);

class OperationLink extends React.Component {
  state = { busy: false, publishModal: false };

  doREST = async (op, topic, data = null) => {
    const { id, makeServicesREST, service } = this.props;

    this.setState({ busy: true });
    try {
      await makeServicesREST(id, service, op, { topic, data });

      toast("success", "Call executed");
    } catch (e) {
      let title = "Operation Failed";
      let message = e.message;
      if (e.response && e.response.data) {
        title = e.response.data.error || title;
        message = e.response.data.message || message;
      }
      toast("error", title, message);
    } finally {
      this.setState({ busy: false });
    }
  };

  onClick = async (e, op, topic, data = null, fromModal = false) => {
    if (op === "publish") {
      if (fromModal) {
        this.setState({ publishModal: false });
        await this.doREST(op, topic, data);
      } else {
        this.setState({ publishModal: true });
      }
    } else {
      await this.doREST(op, topic, data);
    }
  };

  renderPublish = () => {
    if (!this.state.publishModal) {
      return null;
    }
    const { op, topic } = this.props;

    return (
      <TopicPublish
        op={op}
        topic={topic}
        onSubmit={({ data }) => this.onClick(null, op, topic, data, true)}
        onClose={() => this.setState({ publishModal: false })}
      />
    );
  };

  render() {
    const { op, topic } = this.props;
    const { busy } = this.state;

    return (
      <>
        <a
          key={op}
          className={`link text-capitalize ${busy && "disabled"}`}
          onClick={(e) => this.onClick(e, op, topic)}
        >
          {op}
          {busy && <span className="icon-animation spin qtr-margin-left" />}
        </a>
        {this.renderPublish()}
      </>
    );
  }
}

OperationLink = connect(null, { makeServicesREST })(OperationLink);

const ServiceTopicOps = ({ ops, topic, id, service }) => {
  if (!Array.isArray(ops) || !ops.length) return null;

  return (
    <>
      {ops.map((op, i, arr) => {
        return (
          <React.Fragment key={op}>
            <OperationLink op={op} topic={topic} id={id} service={service} />
            {i < arr.length - 1 && <div className="v-separator" />}
          </React.Fragment>
        );
      })}
    </>
  );
};

const ServiceTopic = ({ topic, name, ...props }) => (
  <li>
    <div className="flex">
      <div className="flex-fill">
        <span className="text-bold half-margin-right">{`${name}:`}</span>
        <span>
          <ServiceTopicOps ops={topic.operations} topic={name} {...props} />
        </span>
      </div>
      {topic.subscribed && (
        <Label color="success" size="tiny">
          Subscribed
        </Label>
      )}
    </div>
    <div className="text-muted base-margin-left">{topic.destination}</div>
  </li>
);

export const ServiceTopicList = ({ topics, id, service }) => {
  if (!Object.keys(topics).length) return null;

  Object.keys(topics).forEach((topic) => {
    if (topics[topic].subscribed) {
      topics[topic].operations = ["unsubscribe"];
    } else {
      topics[topic].operations = ["subscribe"];
    }
    topics[topic].operations.push("publish");
  });

  return (
    <ul className="list list--compressed">
      {Object.keys(topics)
        .sort()
        .map((topic) => (
          <ServiceTopic
            name={topic}
            topic={topics[topic]}
            key={topic}
            id={id}
            service={service}
          />
        ))}
    </ul>
  );
};

export default ({ topics, id, service }) => {
  if (!topics || !Object.keys(topics).length) {
    return null;
  }

  return (
    <div className="col">
      <h4 className="no-margin-bottom">Topics</h4>
      <div className="section">
        <ServiceTopicList topics={topics} id={id} service={service} />
      </div>
    </div>
  );
};
