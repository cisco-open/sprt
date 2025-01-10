import React from "react";
import PropTypes from "prop-types";
import { useFormikContext, Field } from "formik";
import download from "downloadjs";
import sanitize from "sanitize-filename";

import { Panel, confirmation, Input, Select, toast } from "react-cui-2.0";

import { saveCertificate } from "../../actions";
import { Buttons } from "./Buttons";

import { notifyOfError, notifyFromError, isSuccess } from "./utils";

const Certificates = () => {
  const {
    values: { certificates },
  } = useFormikContext();

  const downloadHandle = React.useCallback((pem, subject) => {
    download(
      pem,
      sanitize(`${subject.join(" ")}.pem`),
      "application/x-pem-file "
    );
  }, []);

  const saveAsTrustedHandle = React.useCallback((pem, subject) => {
    confirmation(
      <>
        {"Save certificate "}
        <span className="text-bold">{subject.join(", ")}</span>
        {" as trusted?"}
      </>,
      async () => {
        try {
          const r = await saveCertificate("", pem, "trusted");
          if (isSuccess(r)) {
            if (r.found) toast.success("", "Certificate saved");
            else
              toast.info(
                "",
                "Certificate wasn't saved since it is in DB already"
              );
            return true;
          }

          notifyFromError(r.error);
        } catch (e) {
          notifyOfError("Something went wrong", e);
        }
        return false;
      }
    );
  }, []);

  if (!certificates.length) return null;

  return (
    <Panel color="light" raised bordered className="base-margin-top">
      <h5>Certificates:</h5>
      {certificates.map((cert) => {
        const s = cert.subject.slice().reverse();
        const i = cert.issuer.slice().reverse();
        return (
          <Panel color="light" key={cert.serial}>
            <div className="flex">
              <h6 className="flex-fluid">{s.join(", ")}</h6>
              <ul className="list list--inline flex-center-vertical">
                <li>
                  <a
                    className="link"
                    onClick={() => downloadHandle(cert.pem, s)}
                    data-balloon="Download"
                    data-balloon-pos="up"
                  >
                    <span className="icon-download" />
                  </a>
                </li>
                <li>
                  <div className="v-separator" />
                </li>
                <li>
                  <a
                    className="link"
                    onClick={() => saveAsTrustedHandle(cert.pem, s)}
                    data-balloon="Save as trusted"
                    data-balloon-pos="up"
                  >
                    <span className="icon-save" />
                  </a>
                </li>
              </ul>
            </div>
            <dl className="dl--inline-wrap dl--inline-centered">
              <dt>Issuer</dt>
              <dd>{i.join(", ")}</dd>
              <dt>Serial Number</dt>
              <dd>{cert.serial}</dd>
              <dt>Valid from</dt>
              <dd>{cert.notBefore}</dd>
              <dt>Valid till</dt>
              <dd>{cert.notAfter}</dd>
            </dl>
          </Panel>
        );
      })}
    </Panel>
  );
};

const EditScepForm = ({ data }) => {
  const {
    values: { href, certificates },
    initialValues: { href: initHref, certificates: initCerts },
    setFieldValue,
  } = useFormikContext();

  React.useEffect(() => {
    if (href === initHref && !certificates.length)
      setFieldValue("certificates", initCerts, false);
    else if (href !== initHref) setFieldValue("certificates", [], false);
  }, [href, initHref]);

  React.useEffect(() => {
    if (!certificates.length) setFieldValue("canSave", false, false);
  }, [certificates]);

  const {
    result: { signers },
  } = data;

  const validateSigner = React.useCallback(
    (value) =>
      !value || !signers.find((s) => s.id === value)
        ? "Valid signing certificate is required"
        : undefined,
    [signers]
  );

  return (
    <>
      <Field
        component={Input}
        name="name"
        label="Name"
        validate={(value) => (value ? undefined : "Name is required")}
      />
      <Field
        component={Input}
        name="href"
        label="SCEP server URL"
        validate={(value) => (value ? undefined : "URL is required")}
      />
      <Field
        component={Select}
        name="signer"
        title="Signing certificate"
        validate={validateSigner}
      >
        {signers.map((signer) => (
          <option value={signer.id} key={signer.id}>
            {signer.friendly_name}
          </option>
        ))}
      </Field>
      <Buttons />
      <Certificates />
    </>
  );
};

EditScepForm.propTypes = {
  data: PropTypes.shape({
    result: PropTypes.shape({
      signers: PropTypes.arrayOf(PropTypes.any),
      ca_certificates: PropTypes.arrayOf(PropTypes.any),
      name: PropTypes.string,
      signer: PropTypes.string,
      url: PropTypes.string,
    }),
  }).isRequired,
};

export default EditScepForm;
