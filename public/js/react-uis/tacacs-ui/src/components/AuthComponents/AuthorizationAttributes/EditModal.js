import React from "react";
import TransitionGroup from "react-transition-group/TransitionGroup";
import { connect, Field, getIn } from "formik";

import {
  Input,
  Switch,
  Alert,
  ConditionalWrapper as WrapIf,
  Button,
  ButtonGroup,
  Modal,
  ModalBody,
  ModalFooter,
} from "react-cui-2.0";

import Fade from "animations/FadeCollapse";
import Divider from "var-builder/FieldDivider";
import { MS_IN_HOUR } from "../../common/Time";
import Service from "./Service";
import Cmd from "./Cmd";
import CustomAttribute from "./CustomAttribute";

const AcctEdit = ({ formik, prefix, addAttr, deleteAttr }) => {
  return (
    <>
      <TransitionGroup component={null} appear={false} enter exit>
        {getIn(formik.values, `${prefix}.custom`, []).map((attr, idx) => (
          <Fade key={attr.id}>
            <CustomAttribute
              prefix={`${prefix}.custom.${idx}`}
              onDelete={() => deleteAttr(attr.id)}
            />
          </Fade>
        ))}
      </TransitionGroup>
      <div className="flex flex-center half-margin-top half-margin-bottom">
        <Button.Light onClick={addAttr}>
          Add attribute
          <span
            className="icon-add-outline qtr-margin-left"
            title="Add attribute"
          />
        </Button.Light>
      </div>
    </>
  );
};

const AuthorEdit = ({ formik, prefix, addAttr, deleteAttr }) => {
  const [showCmd, setShowCmd] = React.useState(false);
  const service = getIn(formik.values, `${prefix}.service`);

  React.useEffect(() => {
    if (service === "shell") setShowCmd(true);
  }, [service]);

  return (
    <>
      <Service prefix={prefix} />
      <TransitionGroup component={null} appear={false} enter exit>
        {showCmd ? (
          <Fade key="command-set">
            <Cmd prefix={prefix} onDelete={() => setShowCmd(false)} />
          </Fade>
        ) : null}
        {getIn(formik.values, `${prefix}.custom`, []).map((attr, idx) => (
          <Fade key={attr.id}>
            <CustomAttribute
              prefix={`${prefix}.custom.${idx}`}
              onDelete={() => deleteAttr(attr.id)}
            />
          </Fade>
        ))}
      </TransitionGroup>
      {!showCmd ? (
        <Field
          name={`${prefix}.acct`}
          component={Switch}
          right="Send accounting if authorization passed"
        />
      ) : (
        <Alert.Info className="half-margin-top">
          Accounting parameters will be taken from the command set
        </Alert.Info>
      )}
      <div className="flex flex-center half-margin-top half-margin-bottom">
        <WrapIf condition={!showCmd} wrapper={<ButtonGroup />}>
          {!showCmd ? (
            <Button.Light onClick={() => setShowCmd(true)}>
              Add command set
              <span
                className="icon-add-outline qtr-margin-left"
                title="Add command set"
              />
            </Button.Light>
          ) : null}
          <Button.Light onClick={addAttr}>
            Add attribute
            <span
              className="icon-add-outline qtr-margin-left"
              title="Add attribute"
            />
          </Button.Light>
        </WrapIf>
      </div>
    </>
  );
};

const General = ({ prefix }) => (
  <div className="row base-margin-bottom half-margin-top">
    <div className="col">
      <Field
        component={Input}
        name={`${prefix}.name`}
        label={
          <>
            {"Name of the request "}
            <span className="text-small">(for display only)</span>
          </>
        }
      />
    </div>
    <div className="col">
      <Field
        component={Input}
        name={`${prefix}.dly`}
        type="number"
        min={0}
        max={10 * MS_IN_HOUR}
        label={
          <>
            {"Delay "}
            <span className="text-small">(ms)</span>
          </>
        }
      />
    </div>
  </div>
);

const EditModal = ({ formik, set, handleClose, save }) => {
  const data = set ? getIn(formik.values, ["authz", set.id], {}) : {};
  const prefix = "authz.temp";

  React.useEffect(() => {
    if (!getIn(formik.values, `${prefix}.custom`, undefined))
      formik.setFieldValue(`${prefix}.custom`, [], false);
  }, []);

  React.useEffect(() => {
    if (set) formik.setFieldValue(prefix, { ...data, name: set.name }, false);
  }, [set]);

  const addAttr = () => {
    let a = new Uint16Array(1);
    window.crypto.getRandomValues(a);

    formik.setFieldValue(
      `${prefix}.custom`,
      [
        ...getIn(formik.values, `${prefix}.custom`, []),
        { attr: "", value: "", id: a[0] },
      ],
      false
    );
  };

  const deleteAttr = (id) => {
    const v = getIn(formik.values, `${prefix}.custom`);
    const idx = v.findIndex((v) => v.id === id);

    formik.setFieldValue(
      `${prefix}.custom`,
      [...v.slice(0, idx), ...v.slice(idx + 1)],
      false
    );
  };

  return (
    <Modal
      title="Edit request"
      size="large"
      closeIcon
      closeHandle={handleClose}
      autoClose
      isOpen={Boolean(set)}
    >
      <ModalBody className="text-left">
        <Divider f={{ grouper: "General", accent: true }} />
        <General prefix={prefix} />
        <Divider f={{ grouper: "Attributes", accent: true }} />
        {!set
          ? null
          : React.createElement(set.type === "author" ? AuthorEdit : AcctEdit, {
              formik,
              prefix,
              addAttr,
              deleteAttr,
            })}
      </ModalBody>
      <ModalFooter>
        <Button color="light" onClick={handleClose} type="button">
          Close
        </Button>
        <Button
          color="success"
          onClick={() => save(set, getIn(formik.values, "authz.temp"))}
          type="button"
        >
          Save
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default connect(EditModal);
