import React from "react";
import { getIn } from "formik";

import { Modal, ModalBody, ModalFooter, Button } from "react-cui-2.0";

export const SessionCreds = ({ session }) => {
  const [modal, setModal] = React.useState(false);

  const fields = {
    USERNAME: "Username",
    PASSWORD: "Password",
    NEW_PASSWORD: "New password",
  };

  return (
    <>
      <a onClick={() => setModal(true)} className="qtr-margin-left">
        <span className="icon-contact" title="Session credentials" />
      </a>
      <Modal
        closeIcon
        closeHandle={() => setModal(false)}
        size="large"
        isOpen={modal}
        title="Session credentials"
      >
        <ModalBody className="text-left">
          <dl className="dl--inline-centered">
            {Object.keys(fields).map((v) => {
              const g = getIn(session, `attributes.snapshot.${v}`, undefined);
              if (!g) return null;

              return (
                <React.Fragment key={v}>
                  <dt>{fields[v]}</dt>
                  <dd>{g}</dd>
                </React.Fragment>
              );
            })}
          </dl>
        </ModalBody>
        <ModalFooter>
          <Button.Light onClick={() => setModal(false)}>OK</Button.Light>
        </ModalFooter>
      </Modal>
    </>
  );
};
