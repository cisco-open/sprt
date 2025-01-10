import React from "react";
import { connect } from "react-redux";
import { Field, reduxForm } from "redux-form";
import ReactJsonTree from "react-json-tree";
import { Modal, ModalBody, ModalFooter, toast } from "react-cui-2.0";

import { makeServicesREST } from "../../actions";
import { Button, Input, Select, base16Theme, Checkbox } from "../cui";
import { FadeDiv } from "../posedComponents";

const CallPropsForm = reduxForm({
  form: "callForm",
})(({ handleSubmit, params, call, submitting }) => (
  <form onSubmit={handleSubmit}>
    {params
      .filter((p) => p !== "NODE")
      .map((p, idx) => {
        const idf = `${call}-${idx}`;
        const name = `param-${idx}`;

        switch (p.t) {
          case "input":
            return (
              <Field
                component={Input}
                key={idf}
                id={idf}
                name={name}
                label={p.n}
                value={p.v}
              />
            );
          case "select":
            return (
              <Field
                component={Select}
                name={name}
                title={p.n}
                key={idf}
                id={idf}
              >
                {p.v.map((cur, i) => (
                  <option key={i} value={Array.isArray(cur) ? cur[1] : cur}>
                    {Array.isArray(cur) ? cur[0] : cur}
                  </option>
                ))}
              </Field>
            );
          case "checkboxes":
            return (
              <div className="form-group" style={{ display: "block" }}>
                <label style={{ display: "block" }}>{p.n}</label>
                {p.v.map((cur, i) => (
                  <Field
                    component={Checkbox}
                    name={`${name}[${i}]`}
                    key={`${idf}-${i}`}
                    id={`${idf}-${i}`}
                    value={cur}
                    inline
                    format={(v) => v === cur}
                    normalize={(v) => (v ? cur : null)}
                  >
                    {cur}
                  </Field>
                ))}
              </div>
            );
          default:
            return null;
        }
      })}
    <Button
      color="success"
      type="submit"
      className="half-margin-top"
      disabled={submitting}
    >
      {submitting ? (
        <>
          {"Executing "}
          <span className="icon-animation spin half-margin-left" />
        </>
      ) : (
        "Go"
      )}
    </Button>
  </form>
));

class ServiceRestAPIs extends React.Component {
  state = { selectedCall: null, modalData: null };

  onCallLinkClick = (e, selectedCall) => {
    if (selectedCall === this.state.selectedCall) {
      this.setState({ selectedCall: null });
    } else {
      this.setState({ selectedCall });
    }
  };

  onCallFormSubmit = async (values) => {
    const { selectedCall } = this.state;
    const { id, makeServicesREST, service } = this.props;

    try {
      const vSend = [];
      selectedCall.params.forEach((param, j) => {
        if (values.hasOwnProperty(`param-${j}`)) {
          vSend[j] = values[`param-${j}`];
          if (Array.isArray(vSend[j])) {
            vSend[j] = vSend[j].filter((v) => v !== null);
          }
        }
      });
      const r = await makeServicesREST(id, service, selectedCall.call, vSend);
      this.setState({ modalData: r.data });

      toast("success", "Call executed");
      return true;
    } catch (e) {
      let title = "Operation Failed";
      let message = e.message;
      if (e.response && e.response.data) {
        title = e.response.data.error || title;
        message =
          (e.response.data.content && e.response.data.content.message) ||
          e.response.data.message ||
          message;
      }
      toast("error", title, message);
      return false;
    }
  };

  onCloseModal = () => {
    this.setState({ modalData: null });
  };

  renderModal = () => {
    if (!this.state.modalData) {
      return null;
    }
    return (
      <Modal
        isOpen={Boolean(this.state.modalData)}
        size="large"
        closeIcon
        closeHandle={this.onCloseModal}
        autoClose
        title="Call response"
      >
        <ModalBody className="text-left">
          <div className="text-monospace">
            <ReactJsonTree
              data={this.state.modalData || {}}
              theme={{
                ...base16Theme,
                base00: "var(--cui-background-inactive)",
              }}
              invertTheme={false}
              hideRoot
              shouldExpandNode={(keyName, data, level) => level <= 1}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            className="btn btn--white"
            onClick={this.onCloseModal}
            type="button"
          >
            Close
          </button>
        </ModalFooter>
      </Modal>
    );
  };

  renderCallParams = (call) => {
    const { selectedCall } = this.state;
    const { service } = this.props;
    if (!selectedCall || selectedCall.call !== call) {
      return null;
    }

    return (
      <>
        <FadeDiv className="panel" key={`${service}-call-${selectedCall.call}`}>
          <CallPropsForm
            onSubmit={this.onCallFormSubmit}
            params={selectedCall.params}
            call={selectedCall.call}
          />
        </FadeDiv>
        {this.renderModal()}
      </>
    );
  };

  render() {
    const { serviceData } = this.props;

    if (!serviceData.hasOwnProperty("calls")) {
      return null;
    }

    return (
      <div className="col">
        <h4 className="no-margin-bottom">REST APIs</h4>
        <div className="section">
          <ul className="list list--compressed">
            {serviceData.calls.map((call) => (
              <li key={call.call}>
                <a
                  className="link"
                  onClick={(e) => this.onCallLinkClick(e, call)}
                >
                  {call.call}
                </a>
                {call.wiki && (
                  <a
                    className="link qtr-margin-left"
                    href={call.wiki}
                    target="_blank"
                    style={{ cursor: "help" }}
                    title="Show wiki"
                  >
                    <span className="icon-help-outline" />
                  </a>
                )}
                {this.renderCallParams(call.call)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
}

export default connect(null, { makeServicesREST })(ServiceRestAPIs);
