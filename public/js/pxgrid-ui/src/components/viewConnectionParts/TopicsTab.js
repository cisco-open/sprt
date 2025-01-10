import React from "react";
import { connect } from "react-redux";
import { Panel, TabPane } from "../cui";
import { srvToName } from "../../utils/functions";
import { ServiceTopicList } from "./ServiceTopics";

class TopicsTab extends React.Component {
  renderNoTopics = () => (
    <div className="section">
      No topics yet, try to do Service Lookup first on any service
    </div>
  );

  renderTopics = () => {
    const { topics, id } = this.props;
    const keys = Object.keys(topics)
      .sort((a, b) => srvToName(a).localeCompare(srvToName(b)))
      .filter((srv) => Object.keys(topics[srv]).length);

    return keys.map((service, idx) => {
      if (!Object.keys(topics[service]).length) {
        return null;
      }
      return (
        <React.Fragment key={`topics-of-${service}`}>
          <h4
            className={`no-margin-bottom${idx === 0 ? " base-margin-top" : ""}`}
          >
            {srvToName(service)}
            <span className="text-muted half-margin-left">{`(${service})`}</span>
          </h4>
          <div className="section">
            <ServiceTopicList
              topics={topics[service]}
              id={id}
              service={service}
            />
          </div>
          {idx < keys.length - 1 && <hr />}
        </React.Fragment>
      );
    });
  };

  render() {
    const { topics } = this.props;

    return (
      <TabPane active>
        <Panel noPadding="top">
          <h3 className="display-4 no-margin-bottom">Topics</h3>
          <div className="sections">
            {topics && Object.keys(topics).length
              ? this.renderTopics()
              : this.renderNoTopics()}
          </div>
        </Panel>
      </TabPane>
    );
  }
}

export default connect((state, ownProps) => {
  const connection = state.connections.find(
    (c) => c.id === ownProps.match.params.id
  );
  return {
    topics: connection.topics,
    id: connection.id,
  };
})(TopicsTab);
