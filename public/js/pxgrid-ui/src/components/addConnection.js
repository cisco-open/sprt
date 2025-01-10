/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
import React from "react";
import { connect } from "react-redux";
import { Field, FieldArray, reduxForm, formValueSelector } from "redux-form";
import posed, { PoseGroup } from "react-pose";

import { toast } from "react-cui-2.0";
import { Input, Alert, Select, FileOrText } from "./cui";
import { PosedDiv, PosedA } from "./posedComponents";

import { createConnection } from "../actions";
import { createForm as validators } from "./validators";
import history from "../history";

import "../../../../css/dropzone.css";

const selector = formValueSelector("createForm");
const initialValues = {
  verify: "none",
  authenticationType: "password",
};

const asyncBlurFields = ["dns", "primaryFqdn"];

const AuthTypeDiv = posed.div({
  enter: {
    opacity: 1,
    x: 0,
    delay: 200,
  },
  exit: {
    opacity: 0,
    x: 50,
    transition: { duration: 200 },
  },
});

class CreateFormFirstPage extends React.Component {
  componentDidMount() {
    if (this.props.onParentUnmountSet) {
      this.props.onParentUnmountSet(this.parentWillUnmount);
    }
  }

  parentWillUnmount = () => {
    this.props.destroy();
  };

  renderSecondaries = ({ fields }) => (
    <PoseGroup animateOnMount>
      {fields.map((sec, index) => (
        <PosedDiv key={index} className="flex half-margin-top">
          <Field
            component={Input}
            id={`secondary-${sec}.fqdn`}
            name={`${sec}`}
            label="FQDN (or IP) of a Secondary pxGrid node"
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
        <PosedA
          key="add-sec-node"
          onClick={() => fields.push()}
          className="half-margin-top half-margin-bottom"
        >
          <span className="icon-add-outline half-margin-right" />
          Add another node
        </PosedA>
      )}
    </PoseGroup>
  );

  render() {
    const { handleSubmit, submitting } = this.props;
    return (
      <PosedDiv initialPose="exit" pose="enter">
        <h1 className="base-margin-bottom">General information</h1>
        <form onSubmit={handleSubmit}>
          <Field
            component={Input}
            id="friendlyName"
            name="friendlyName"
            label="Friendly name"
          />
          <Field
            component={Input}
            id="clientName"
            name="clientName"
            label="Client name (will be displayed on ISE)"
          />
          <Field
            component={Input}
            id="description"
            name="description"
            label="Description (will be displayed on ISE)"
          />
          <Field
            component={Input}
            id="dns"
            name="dns"
            label="IP of a DNS server"
          />
          <Field
            component={Input}
            id="primaryFqdn"
            name="primaryFqdn"
            label="FQDN (or IP) of a Primary pxGrid node"
          />
          <FieldArray name="secondaryFqdn" component={this.renderSecondaries} />
          <div className="buttons base-margin-top base-margin-bottom">
            <button
              type="submit"
              className="btn btn--success"
              disabled={submitting}
            >
              Next
            </button>
          </div>
        </form>
      </PosedDiv>
    );
  }
}

CreateFormFirstPage = reduxForm({
  form: "createForm",
  destroyOnUnmount: false,
  forceUnregisterOnUnmount: true,
  initialValues,
  validate: validators.validate,
  asyncValidate: validators.asyncValidate,
  asyncBlurFields,
})(CreateFormFirstPage);

class CreateFormSecondPage extends React.Component {
  componentDidMount() {
    if (this.props.onParentUnmountSet) {
      this.props.onParentUnmountSet(this.parentWillUnmount);
    }
  }

  parentWillUnmount = () => {
    this.props.destroy();
  };

  renderPasswordBased() {
    return (
      <AuthTypeDiv className="half-margin-top" key="password-based">
        <Alert type="info">
          <div>Client name will be used as username</div>
          <div>Password will be provided by ISE</div>
        </Alert>
      </AuthTypeDiv>
    );
  }

  renderCertificateBased() {
    return (
      <AuthTypeDiv className="half-margin-top" key="certificate-based">
        <Field
          component={FileOrText}
          name="clientCertificate"
          label="Client certificate"
          accept=".txt,.cer,.pem,.crt"
          maxFileSize="500KB"
          inline
          maxFiles={1}
          multiple={false}
        />
        <Field
          component={FileOrText}
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
          label="Passphrase for the private key"
        />
        <Field
          component={FileOrText}
          name="clientCertificateChain"
          label="Client CA chain"
          accept=".txt,.cer,.pem,.crt"
          maxFileSize="500KB"
          showTotalSelected
        />
      </AuthTypeDiv>
    );
  }

  render() {
    const {
      handleSubmit,
      previousPage,
      authenticationType,
      submitting,
    } = this.props;
    return (
      <PosedDiv initialPose="exit" pose="enter">
        <h1 className="base-margin-bottom">Authentication of the client</h1>
        <form onSubmit={handleSubmit}>
          <Field
            component={Select}
            name="authenticationType"
            title="Authentication type"
            id="authenticationType"
            prompt="Select an option"
          >
            <option value="password">Password-based</option>
            <option value="certificate">Certificate-based</option>
          </Field>
          <PoseGroup animateOnMount>
            {authenticationType === "certificate" &&
              this.renderCertificateBased()}
            {authenticationType === "password" && this.renderPasswordBased()}
          </PoseGroup>
          <div className="buttons base-margin-top base-margin-bottom">
            <button
              type="button"
              onClick={previousPage}
              className="btn btn--white"
            >
              Back
            </button>
            <button
              type="submit"
              className="btn btn--success"
              disabled={submitting}
            >
              Next
            </button>
          </div>
        </form>
      </PosedDiv>
    );
  }
}

CreateFormSecondPage = reduxForm({
  form: "createForm",
  destroyOnUnmount: false,
  forceUnregisterOnUnmount: true,
  validate: validators.validate,
  asyncValidate: validators.asyncValidate,
})(CreateFormSecondPage);

CreateFormSecondPage = connect((state) => {
  return { authenticationType: selector(state, "authenticationType") };
})(CreateFormSecondPage);

class CreateFormThirdPage extends React.Component {
  componentDidMount() {
    if (this.props.onParentUnmountSet) {
      this.props.onParentUnmountSet(this.parentWillUnmount);
    }
  }

  parentWillUnmount = () => {
    this.props.destroy();
  };

  renderVerify = () => (
    <PosedDiv initialPose="exit" pose="enter" className="half-margin-top">
      <Field
        component={FileOrText}
        name="serverCertificateChain"
        label="Server CA chain"
        accept=".txt,.cer,.pem,.crt"
        maxFileSize="500KB"
        showTotalSelected
      />
    </PosedDiv>
  );

  render() {
    const { handleSubmit, previousPage, verify, submitting } = this.props;
    return (
      <PosedDiv initialPose="exit" pose="enter">
        <h1 className="base-margin-bottom">pxGrid server verification</h1>
        <form onSubmit={handleSubmit}>
          <div className="half-margin-top">
            <Field
              component={Select}
              name="verify"
              title="What should be verified"
              id="verify"
              prompt="Select an option"
            >
              <option value="none">Nothing</option>
              <option value="certNoHostname">
                Verify certificate, do not verify hostname
              </option>
              <option value="certAndHostname">
                Verify certificate and hostname
              </option>
            </Field>
            {verify && verify !== "none" ? this.renderVerify() : null}
          </div>
          <div className="buttons base-margin-top base-margin-bottom">
            <button
              type="button"
              onClick={previousPage}
              className="btn btn--white"
            >
              Back
            </button>
            <button
              type="submit"
              className="btn btn--success"
              disabled={submitting}
            >
              Save
            </button>
          </div>
        </form>
      </PosedDiv>
    );
  }
}

CreateFormThirdPage = reduxForm({
  form: "createForm",
  destroyOnUnmount: false,
  forceUnregisterOnUnmount: true,
  validate: validators.validate,
  asyncValidate: validators.asyncValidate,
})(CreateFormThirdPage);

CreateFormThirdPage = connect((state) => {
  return { verify: selector(state, "verify") };
})(CreateFormThirdPage);

class CreateConnection extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      page: 1,
    };

    this.unmountListener = undefined;
  }

  componentWillUnmount() {
    if (this.unmountListener) {
      this.unmountListener();
    }
  }

  nextPage = () => {
    this.setState({ page: this.state.page + 1 });
  };

  previousPage = () => {
    this.setState({ page: this.state.page - 1 });
  };

  onSubmit = async (values) => {
    try {
      await this.props.createConnection(values);
      toast("success", "Connection Created");
      history.push("/pxgrid/");
      return true;
    } catch (e) {
      let title = "Operation Failed";
      let { message } = e;
      if (e.response && e.response.data) {
        title = e.response.data.error || title;
        message = e.response.data.message || message;
      }
      toast("error", title, message);
      return false;
    }
  };

  unmountListenerSet = (call) => {
    this.unmountListener = call;
  };

  pageOrCheck = (v) => {
    return this.state.page > v ? <span className="icon-check" /> : v;
  };

  render() {
    const { page } = this.state;
    return (
      <PosedDiv
        initialPose="exit"
        pose="enter"
        className="base-margin-top base-margin-bottom row"
      >
        <div className="col-2 offset-1">
          <div className="ui-steps ui-steps--vertical">
            <div
              className={`ui-step ${page > 1 && "visited"} ${
                page === 1 && "active"
              }`}
            >
              <div className="step__icon">{this.pageOrCheck(1)}</div>
              <div className="step__label">General</div>
            </div>
            <div
              className={`ui-step ${page > 2 && "visited"} ${
                page === 2 && "active"
              }`}
            >
              <div className="step__icon">{this.pageOrCheck(2)}</div>
              <div className="step__label">Authentication</div>
            </div>
            <div
              className={`ui-step ${page > 3 && "visited"} ${
                page === 3 && "active"
              }`}
            >
              <div className="step__icon">{this.pageOrCheck(3)}</div>
              <div className="step__label">Server verification</div>
            </div>
          </div>
        </div>
        <div className="col-8">
          {page === 1 && (
            <CreateFormFirstPage
              page={page}
              onSubmit={this.nextPage}
              onParentUnmountSet={this.unmountListenerSet}
            />
          )}
          {page === 2 && (
            <CreateFormSecondPage
              page={page}
              previousPage={this.previousPage}
              onSubmit={this.nextPage}
              onParentUnmountSet={this.unmountListenerSet}
            />
          )}
          {page === 3 && (
            <CreateFormThirdPage
              page={page}
              previousPage={this.previousPage}
              onSubmit={this.onSubmit}
              onParentUnmountSet={this.unmountListenerSet}
            />
          )}
        </div>
      </PosedDiv>
    );
  }
}

export default connect(undefined, {
  createConnection,
})(CreateConnection);
