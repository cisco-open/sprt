import React from "react";
import PropTypes from "prop-types";
import { Formik, Field } from "formik";

import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  Input,
  toast,
  DisplayIf as If,
} from "react-cui-2.0";

import { SigningCertsContext } from "../../../contexts";
import { uploadSignerCert } from "../../../actions";
import {
  notifyOfError,
  notifyFromError,
  isSuccess,
} from "../../EditScepForm/utils";

const AddModal = ({ isOpen, closeHandle }) => {
  const { newSigners, clearSelection } = React.useContext(SigningCertsContext);

  const onSubmit = React.useCallback(
    async (values) => {
      const data = new FormData();
      Object.keys(values).forEach((key) => data.append(key, values[key]));
      try {
        const r = await uploadSignerCert(data);
        if (isSuccess(r)) {
          toast.success("", "Certificate uploaded");
          newSigners(r.signers);
          clearSelection();
          closeHandle();
          return true;
        }

        notifyFromError(r.error);
      } catch (e) {
        notifyOfError("Something went wrong", e);
      }
      return false;
    },
    [clearSelection, newSigners, closeHandle]
  );

  return (
    <Modal
      closeIcon
      closeHandle={closeHandle}
      isOpen={isOpen}
      title="Add signing certificate"
    >
      <Formik
        initialValues={{
          "signer-friendly-name": "",
          certificate: "",
          pvk: "",
          "pvk-password": "",
        }}
        onSubmit={onSubmit}
        enableReinitialize
      >
        {({ isSubmitting, isValid, submitForm, setFieldValue }) => (
          <>
            <ModalBody>
              <Field
                component={Input}
                label="Friendly name"
                name="signer-friendly-name"
              />
              <Field
                component={Input}
                label={
                  <>
                    {"Certificate "}
                    <span className="text-xsmall">(PEM or DER)</span>
                  </>
                }
                type="file"
                name="certificateUncontrolled"
                onChange={(event) => {
                  setFieldValue("certificate", event.currentTarget.files[0]);
                }}
              />
              <Field
                component={Input}
                label={
                  <>
                    {"Private Key "}
                    <span className="text-xsmall">(PEM or DER)</span>
                  </>
                }
                type="file"
                name="pvkUncontrolled"
                onChange={(event) => {
                  setFieldValue("pvk", event.currentTarget.files[0]);
                }}
              />
              <Field component={Input} label="Passphrase" name="pvk-password" />
            </ModalBody>
            <ModalFooter>
              <Button.Light onClick={closeHandle}>Close</Button.Light>
              <Button.Success
                onClick={submitForm}
                disabled={isSubmitting || !isValid}
              >
                Save
                <If condition={isSubmitting}>
                  <span className="icon-animation spin half-margin-left" />
                </If>
              </Button.Success>
            </ModalFooter>
          </>
        )}
      </Formik>
    </Modal>
  );
};

AddModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  closeHandle: PropTypes.func.isRequired,
};

const Add = () => {
  const [shown, setShown] = React.useState(false);
  const showHandle = React.useCallback(() => setShown(true), []);
  const closeHandle = React.useCallback(() => setShown(false), []);

  return (
    <>
      <Button.Light onClick={showHandle}>
        <span className="icon-add-outline half-margin-right" />
        <span>Add signing certificate</span>
      </Button.Light>
      <AddModal isOpen={shown} closeHandle={closeHandle} />
    </>
  );
};

Add.propTypes = {};

Add.defaultProps = {};

export default Add;
