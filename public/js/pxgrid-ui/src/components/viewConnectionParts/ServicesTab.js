import React from "react";
import { connect } from "react-redux";
import { Route } from "react-router-dom";
import { fetchConnections } from "../../actions";
import history from "../../history";
import { Panel, TabPane, Dropdown } from "../cui";
import { FadeDiv } from "../posedComponents";

import ServiceTopics from "./ServiceTopics";
import ServiceLookup from "./ServiceLookup";
import ServiceDetails from "./ServiceDetails";
import ServiceRestAPIs from "./ServiceRestAPIs";

const ServiceOptions = (props) => (
  <FadeDiv key={`service-${props.service}-options`}>
    <ServiceDetails {...props} />
    <div className="row">
      <ServiceRestAPIs {...props} />
      <ServiceTopics {...props} />
    </div>
  </FadeDiv>
);

/**
 * Services tab
 */

class ServicesTab extends React.Component {
  renderDropDown = () => {
    const { availableServices } = this.props;

    return availableServices.map(({ service, name }) => (
      <a
        key={service}
        onClick={() => {
          history.push(
            `/pxgrid/connections/${this.props.match.params.id}/services/${service}`
          );
        }}
        className={
          RegExp(`/${service}$`).test(window.location.href) ? "selected" : ""
        }
      >
        {name}
      </a>
    ));
  };

  ddHeader = () => {
    const { availableServices } = this.props;
    const found = window.location.href.match("/services/([a-z0-9.]+)");
    const service = Array.isArray(found) && found[1] ? found[1] : null;

    const idx = availableServices.findIndex((s) => s.service === service);
    let text =
      !service || idx < 0 ? "Select service" : availableServices[idx].name;

    return (
      <h3 className="display-4 no-margin-bottom half-margin-right">{text}</h3>
    );
  };

  notLookedUp = (id, service) => (
    <ServiceLookup connection={id} service={service} />
  );

  serviceOps = (id, service) => {
    const { services, topics } = this.props;
    return (
      <ServiceOptions
        service={service}
        serviceData={services[service]}
        topics={topics[service] || {}}
        id={id}
      />
    );
  };

  renderContent = (props) => {
    const { services } = this.props;
    const {
      match: {
        params: { service, id },
      },
    } = props;

    if (!service) {
      return null;
    }

    let what;
    if (!services[service]) {
      what = this.notLookedUp;
    } else {
      what = this.serviceOps;
    }

    return <div className="sections">{what(id, service)}</div>;
  };

  render() {
    const connPart =
      "/pxgrid/connections/:id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})";

    return (
      <TabPane active>
        <Panel noPadding="top">
          <div className="flex flex-center-vertical">
            <h3 className="display-4 no-margin-bottom half-margin-right">
              Service:
            </h3>
            <Dropdown
              type="link"
              tail
              header={this.ddHeader()}
              alwaysClose
              className="flex-center-vertical"
            >
              {this.renderDropDown()}
            </Dropdown>
          </div>
          <Route
            path={`${connPart}/services/:service`}
            render={this.renderContent}
          />
        </Panel>
      </TabPane>
    );
  }
}

export default connect(
  (state, ownProps) => {
    const connection = state.connections.find(
      (c) => c.id === ownProps.match.params.id
    );
    return {
      services: connection.services,
      topics: connection.topics,
      availableServices: connection.availableServices,
    };
  },
  { fetchConnections }
)(ServicesTab);
