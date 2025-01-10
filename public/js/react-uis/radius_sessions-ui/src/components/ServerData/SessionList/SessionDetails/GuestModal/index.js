import React from "react";

import { Modal, ModalBody, ModalFooter, Alert, Button } from "react-cui-2.0";
import { eventManager } from "my-utils/eventManager";

const FIELDS = [
  "FIRST_NAME",
  "COMPANY",
  "EMAIL_ADDRESS",
  "LAST_NAME",
  "PERSON_VISITED",
  "PHONE_NUMBER",
  "REASON_VISIT",
  "USER_AGENT",
  "USER_NAME",
  "CREDENTIALS",
].sort();

const Body = ({ data }) => {
  if (!data) return <Alert.Info>No guest data.</Alert.Info>;

  return (
    <dl className="dl--inline-wrap dl--inline-centered">
      {FIELDS.map((f) => {
        if (!(f in data)) return null;
        if (f === "CREDENTIALS") {
          return (
            <React.Fragment key={f}>
              <dt className="text-capitalize">Login</dt>
              <dd>{data.CREDENTIALS[0]}</dd>
              <dt className="text-capitalize">Password</dt>
              <dd>{data.CREDENTIALS[1]}</dd>
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={f}>
            <dt className="text-capitalize">
              {f.replace("_", " ").toLowerCase()}
            </dt>
            <dd>{data[f] || "&nbsp;"}</dd>
          </React.Fragment>
        );
      }).filter((v) => Boolean(v))}
    </dl>
  );
};

export const guestModalEvent = "session.show.guest";

export const GuestModalListner = () => {
  const [data, setData] = React.useState(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    eventManager.on(guestModalEvent, (attributes) => {
      setData(attributes);
    });
  }, []);

  React.useEffect(() => {
    if (data) setShown(true);
  }, [data]);

  const onClose = () => setShown(false);

  if (!data) return null;

  return (
    <Modal
      closeIcon
      closeHandle={onClose}
      size="large"
      isOpen={shown}
      title="Guest data"
    >
      <ModalBody className="text-left">
        <Body data={data} />
      </ModalBody>
      <ModalFooter>
        <Button.Light onClick={onClose}>OK</Button.Light>
      </ModalFooter>
    </Modal>
  );
};
