import React from "react";
import { connect, Field, getIn } from "formik";

import {
  Input,
  Switch,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
} from "react-cui-2.0";

import CommandList from "./CommandList";

const EditAcct = connect(({ formik, commands }) => {
  const [value, setValue] = React.useState("none");

  React.useEffect(() => {
    const list = [
      ...new Set(getIn(formik.values, commands, []).map((v) => v.acc)),
    ];
    if (list.length === 1) setValue(list[0]);
    else setValue("none");
  }, [getIn(formik.values, commands, [])]);

  const update = (newValue) => {
    const list = getIn(formik.values, commands, []);
    if (!list.length) return;
    list.forEach((v) => {
      v.acc = newValue;
    });
    formik.setFieldValue(commands, [...list], false);
  };

  return (
    <div className="form-group form-group--inline">
      <div className="form-group__text">
        <label>Accounting</label>
        <ul className="list list--inline divider--vertical">
          {[
            ["off", "off"],
            ["authorized", "if authorized"],
            ["always", "always"],
          ].map(([v, text]) => (
            <li key={v}>
              {value === v ? (
                <span className="text-primary">{text}</span>
              ) : (
                <span className="link" onClick={() => update(v)}>
                  {text}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
});

const EditModal = ({ formik, set, handleClose, save }) => {
  const data = set ? getIn(formik.values, ["commands", set.id], {}) : {};
  const prefix = "commands.temp";

  React.useEffect(() => {
    if (set) formik.setFieldValue(prefix, { ...data, name: set.name }, false);
  }, [set]);

  return (
    <Modal
      title="Edit set"
      size="full"
      closeIcon
      closeHandle={handleClose}
      autoClose
      isOpen={Boolean(set)}
    >
      <ModalBody className="text-left">
        <div className="row">
          <div
            className="col-md-5 col-lg-4 col-xl-3"
            style={{ borderRight: "var(--cui-border)" }}
          >
            <h4 className="display-4">Parameters</h4>
            <Field
              component={Input}
              name={`${prefix}.name`}
              label={
                <>
                  {"Name of the command set "}
                  <span className="text-small">(for display only)</span>
                </>
              }
            />
            <Field
              component={Switch}
              name={`${prefix}.should_stop_on_fail`}
              right="Stop after first failed command"
            />
            <EditAcct commands={`${prefix}.commands`} />
          </div>
          <div className="col-md-7 col-lg-8 col-xl-9">
            <h4 className="display-4 no-margin-bottom">Commands</h4>
            <h5 className="subheading">
              Enter full commands. Paste multi-line text, every line will be
              added as a command
            </h5>
            <Field component={CommandList} name={`${prefix}.commands`} />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="light" onClick={handleClose} type="button">
          Close
        </Button>
        <Button
          color="success"
          onClick={() => save(set, getIn(formik.values, "commands.temp"))}
          type="button"
        >
          Save
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default connect(EditModal);
