/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import posed, { PoseGroup } from "react-pose";
import { Field, FieldArray, reduxForm, formValueSelector } from "redux-form";

import { Input, Switch, Alert, Dropzone } from "./cui";

import "../../../../css/dropzone.css";

const PosedDiv = posed.div({
  enter: { opacity: 1 },
  exit: { opacity: 0 },
});

const A = posed.a({
  enter: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0 } },
});

const AuthTypeDiv = posed.div({
  enter: {
    opacity: 1,
    y: 0,
    delay: 200,
  },
  exit: {
    opacity: 0,
    y: 50,
    transition: { duration: 200 },
  },
});

class EditForm extends Component {
  onSubmit = (values) => {
    console.log(values);
  };

  renderPasswordBased() {
    return (
      <AuthTypeDiv className="base-margin-top" key="password-based">
        <Alert type="info">
          <div>Client name will be used as username</div>
          <div>Password will be provided by ISE</div>
        </Alert>
      </AuthTypeDiv>
    );
  }

  renderCertificateBased() {
    return (
      <AuthTypeDiv className="base-margin-top" key="certificate-based">
        <Field
          component={Dropzone}
          name="clientCertificate"
          label="Client certificate"
          accept=".txt,.cer,.pem,.crt"
          maxFileSize="500KB"
          inline
          maxFiles={1}
          multiple={false}
        />
        <Field
          component={Dropzone}
          name="clientPrivateKey"
          label="Private key"
          accept=".txt,.pem,.pvk"
          maxFileSize="500KB"
          inline
          maxFiles={1}
          multiple={false}
        />
        <Field
          component={Input}
          id="clientPvkPassword"
          name="clientPvkPassword"
          text="Passphrase for the private key"
        />
        <Field
          component={Dropzone}
          name="clientCertificateChain"
          label="Client CA chain"
          accept=".txt,.cer,.pem,.crt"
          maxFileSize="500KB"
        />
      </AuthTypeDiv>
    );
  }

  renderSecondaries = ({ fields }) => (
    <PoseGroup>
      {fields.map((sec, index) => (
        <PosedDiv key={index} className="flex half-margin-top">
          <Field
            component={Input}
            id={`secondary-${sec}.fqdn`}
            name={`${sec}`}
            text="FQDN (or IP) of a Secondary pxGrid node"
            className="half-margin-right flex-fill"
          />
          <div className="btn-group btn-group--large btn-group--square base-margin-top">
            <button
              type="button"
              className="btn btn--icon btn--white not-submit remove-attribute"
              onClick={() => fields.remove(index)}
            >
              <span className="icon-remove" title="Remove node" />
            </button>
          </div>
        </PosedDiv>
      ))}
      {fields.length < 3 && (
        <A
          key="add-sec-node"
          onClick={() => fields.push()}
          className="half-margin-top half-margin-bottom"
        >
          <span className="icon-add-outline half-margin-right" />
          Add another node
        </A>
      )}
    </PoseGroup>
  );

  render() {
    return (
      <form onSubmit={this.props.handleSubmit(this.onSubmit)}>
        <Field
          component={Input}
          id="friendlyName"
          name="friendlyName"
          text="Friendly name"
        />
        <Field
          component={Input}
          id="clientName"
          name="clientName"
          text="Client name (will be displayed on ISE)"
        />
        <Field
          component={Input}
          id="description"
          name="description"
          text="Description (will be displayed on ISE)"
        />
        <Field
          component={Input}
          id="dns"
          name="dns"
          text="IP of a DNS server"
        />
        <Field
          component={Input}
          id="primaryFqdn"
          name="primaryFqdn"
          text="FQDN (or IP) of a Primary pxGrid node"
        />
        <FieldArray name="secondaryFqdn" component={this.renderSecondaries} />
        <div className="flex-center-horizontal half-margin-top">
          <Field
            component={Switch}
            name="authenticationType"
            left="Password-based authentication"
            leftValue="password"
            right="Certificate-based authentication"
            rightValue="certificate"
          />
        </div>
        <PoseGroup>
          {this.props.authenticationType === "certificate" &&
            this.renderCertificateBased()}
          {this.props.authenticationType === "password" &&
            this.renderPasswordBased()}
        </PoseGroup>
        <div className="buttons base-margin-top">
          <button className="btn btn--success" type="button">
            Save
          </button>
        </div>
      </form>
    );
  }
}

const validate = (values) => {
  let err = {};
  if (!values.clientName) {
    err.clientName = "Client name is required";
  }

  if (values.clientName) {
    if (
      values.clientName.length > 50 ||
      !/^[a-z0-9_.-]+$/i.test(values.clientName)
    ) {
      err.clientName =
        "Client name has a limit of 50 characters. It can contain alphanumberics (a-z, 0-9), dashes (-), underscores (_), and periods (.)";
    }
  }

  if (!values.primaryFqdn) {
    err.primaryFqdn = "FQDN of a primary pxGrid node is required";
  }

  if (values.authenticationType) {
    if (!values.clientCertificate || values.clientCertificate.length === 0) {
      err.clientCertificate = "Client certificate is required";
    }

    if (!values.clientPrivateKey || values.clientPrivateKey.length === 0) {
      err.clientPrivateKey = "Private key is required";
    }
  }

  return err;
};

let EditFormRedux = reduxForm({
  form: "editForm",
  validate,
})(EditForm);

const selector = formValueSelector("editForm");
EditFormRedux = connect((state) => {
  return {
    authenticationType: selector(state, "authenticationType")
      ? "certificate"
      : "password",
  };
})(EditFormRedux);

const EditConnection = () => (
  <PosedDiv
    initialPose="exit"
    pose="enter"
    className="base-margin-top base-margin-bottom row"
  >
    <div className="col-2 offset-1">
      <div className="ui-steps ui-steps--vertical">
        <div className="ui-step visited">
          <div className="step__icon">1</div>
          <div className="step__label">General</div>
        </div>
        <div className="ui-step active">
          <div className="step__icon">2</div>
          <div className="step__label">Authentication</div>
        </div>
        <div className="ui-step">
          <div className="step__icon">3</div>
          <div className="step__label">Server verification</div>
        </div>
      </div>
    </div>
    <div className="col-8">
      <EditFormRedux />
    </div>
  </PosedDiv>
);

export default withRouter(connect(undefined)(EditConnection));
