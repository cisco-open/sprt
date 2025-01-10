/* eslint-disable react/jsx-indent */
/* eslint-disable react/no-array-index-key */
import React from "react";
import PropTypes from "prop-types";
import { Field, getIn, useFormikContext, isInteger } from "formik";
import toPath from "lodash/toPath";
import { CSSTransition } from "react-transition-group";

import {
  Dropdown,
  Input,
  Select,
  Button,
  ButtonGroup,
  Checkbox,
  DisplayIf as If,
  AccordionElement,
  Accordion,
} from "react-cui-2.0";

import { loadTemplates } from "./actions";

const defaultCSR = {
  subject: {
    cn: "test",
    ou: ["SPRT"],
  },
  san: {
    dNSName: ["test"],
    iPAddress: ["1.1.1.1"],
  },
  key_type: "rsa",
  key_length: "2048",
  digest: "sha256",
  ext_key_usage: {
    clientAuth: true,
    serverAuth: false,
  },
  key_usage: {},
};

const SANtypes = {
  rfc822Name: "RFC822 Name (can be MAC)",
  dNSName: "DNS Name",
  directoryName: "Directory Name",
  uniformResourceIdentifier: "Uniform Resource Identifier",
  iPAddress: "IP Address",
};

const DIGESTS = {
  sha1: "SHA-1",
  sha256: "SHA-256",
  sha384: "SHA-384",
  sha512: "SHA-512",
};

const EXT_KEY_USAGES = {
  clientAuth: "Client Authentication",
  serverAuth: "Server Authentication",
  codeSigning: "Code Signing",
  emailProtection: "Email Protection",
  timeStamping: "Time Stamping",
};

const KEY_USAGES = {
  digitalSignature: "Digital Signature",
  nonRepudiation: "Non Repudiation",
  keyEncipherment: "Key Encipherment",
  dataEncipherment: "Data Encipherment",
  keyAgreement: "Key Agreement",
  keyCertSign: "Key CertSign",
  cRLSign: "CRL Sign",
  encipherOnly: "Encipher Only",
  decipherOnly: "Decipher Only",
};

const subjectOrder = ["cn", "ou", "o", "l", "st", "c", "e"];
const makePath = (...args) =>
  args.filter((a) => typeof a !== "undefined" && a !== null).join(".");

const dn = {};
const DN_IN = (full, short, display) => {
  const t = { short, full, display };
  dn[short] = t;
  dn[full] = t;
};

DN_IN("commonName", "CN", "Common Name");
DN_IN("countryName", "C", "Country");
DN_IN("localityName", "L", "Locality");
DN_IN("stateOrProvinceName", "ST", "State or Province");
DN_IN("organizationName", "O", "Organization");
DN_IN("organizationalUnitName", "OU", "Organizational Unit");
DN_IN("emailAddress", "E", "Email Address");

const CSSSwap = (props) => (
  <CSSTransition
    mountOnEnter
    unmountOnExit
    appear
    classNames={{
      appear: "animated fadeIn fastest",
      appearActive: "animated fadeIn fastest",
      appearDone: "animated",
      enter: "animated fadeIn fastest",
      enterActive: "animated fadeIn fastest",
      enterDone: "animated",
      exit: "fanimated fadeOut fastest",
      exitActive: "animated fadeOut fastest",
      exitDone: "hide",
    }}
    timeout={300}
    {...props}
  />
);

const Drawer = ({ title, children, in: initial }) => {
  const [shown, setShown] = React.useState(initial);
  return (
    <div
      className={`drawer half-margin-bottom${shown ? " drawer--opened" : ""}`}
    >
      <div
        className="drawer__header"
        onClick={() => setShown((curr) => !curr)}
        style={{ cursor: "pointer" }}
      >
        <a className="dbl-margin-right flex flex-center-vertical">
          <h5 className="no-margin-bottom">{title}</h5>
        </a>
      </div>
      <CSSSwap in={shown}>{children}</CSSSwap>
    </div>
  );
};

Drawer.propTypes = {
  title: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
  in: PropTypes.bool,
};

Drawer.defaultProps = {
  in: false,
};

const RemoveWrap = ({ children }) => {
  const child = React.Children.only(children);
  const { setFieldValue, values, unregisterField } = useFormikContext();
  const path = child.props.name;

  const removeHandle = React.useCallback(() => {
    const p = toPath(path);
    if (isInteger(p[p.length - 1])) {
      const realPath = p.slice(0, p.length - 1).join(".");
      const arr = getIn(values, realPath);
      arr.splice(p[p.length - 1], 1);
      setFieldValue(realPath, arr, false);
      return;
    }

    setFieldValue(path, undefined, false);
    unregisterField(path);
  }, [path, values]);

  return (
    <div className="flex separate">
      {React.cloneElement(child, {
        className: `${child.props.className} flex-fill`,
      })}
      <ButtonGroup
        square
        size="large"
        className="half-margin-left base-margin-top"
      >
        <Button
          icon
          color="link"
          onClick={removeHandle}
          data-balloon="Remove"
          data-balloon-pos="up"
        >
          <span className="icon-remove" />
        </Button>
      </ButtonGroup>
    </div>
  );
};

RemoveWrap.propTypes = {
  children: PropTypes.node.isRequired,
};

const SubjectElement = ({ el, path, label }) => {
  if (typeof el === "undefined" || el === null) return null;

  if (Array.isArray(el))
    return el.map((_val, idx) => (
      <RemoveWrap key={idx}>
        <Field
          component={Input}
          name={makePath(path, idx)}
          label={label}
          className="fadeIn faster"
        />
      </RemoveWrap>
    ));

  return (
    <RemoveWrap>
      <Field
        component={Input}
        name={path}
        label={label}
        className="fadeIn faster"
      />
    </RemoveWrap>
  );
};

SubjectElement.propTypes = {
  el: PropTypes.oneOfType([PropTypes.array, PropTypes.string]).isRequired,
  path: PropTypes.string.isRequired,
  label: PropTypes.node.isRequired,
};

const Subject = ({ prefix }) => {
  const { values, setFieldValue } = useFormikContext();
  const subject = getIn(values, makePath(prefix, "subject"), {});
  const addSubjectHandle = React.useCallback(
    (s) => {
      const path = makePath(prefix, "subject", s);
      const v = getIn(values, path, []);
      setFieldValue(path, [...(Array.isArray(v) ? v : [v]), ""]);
    },
    [prefix, values]
  );

  return (
    <>
      <div className="flex flex-center-vertical">
        <h5 className="no-margin-bottom half-margin-right">Subject</h5>
        <Dropdown
          type="link"
          header="Add"
          alwaysClose
          className="btn--dropdown"
        >
          {subjectOrder.map((s) => (
            <a onClick={() => addSubjectHandle(s)} key={s}>
              {dn[s.toUpperCase()].display}
              {` (${s.toUpperCase()})`}
            </a>
          ))}
        </Dropdown>
      </div>
      <div className="panel">
        {subjectOrder.map((s) => (
          <SubjectElement
            key={s}
            el={subject[s]}
            path={makePath(prefix, "subject", s)}
            label={dn[s.toUpperCase()].display}
          />
        ))}
      </div>
    </>
  );
};

Subject.propTypes = {
  prefix: PropTypes.string.isRequired,
};

const SANs = ({ prefix }) => {
  const { values, setFieldValue } = useFormikContext();
  const localPrefix = React.useMemo(() => makePath(prefix, "san"), [prefix]);
  const san = getIn(values, localPrefix, {});

  const addSubjectHandle = React.useCallback(
    (s) => {
      const path = makePath(localPrefix, s);
      const v = getIn(values, path, []);
      setFieldValue(path, [...(Array.isArray(v) ? v : [v]), ""]);
    },
    [localPrefix, values]
  );

  return (
    <>
      <div className="flex flex-center-vertical half-margin-top">
        <h5 className="no-margin-bottom half-margin-right">
          Subject Alternative Names (SAN)
        </h5>
        <Dropdown
          type="link"
          header="Add"
          alwaysClose
          className="btn--dropdown"
        >
          {Object.keys(SANtypes)
            .sort()
            .map((s) => (
              <a onClick={() => addSubjectHandle(s)} key={s}>
                {SANtypes[s]}
              </a>
            ))}
        </Dropdown>
      </div>
      <div className="panel">
        {Object.keys(san)
          ? Object.keys(san)
              .sort()
              .map((s) => (
                <SubjectElement
                  key={s}
                  el={san[s]}
                  path={makePath(localPrefix, s)}
                  label={SANtypes[s]}
                />
              ))
          : null}
      </div>
    </>
  );
};

SANs.propTypes = {
  prefix: PropTypes.string.isRequired,
};

const RSA = ({ prefix }) => {
  const keyLength = React.useMemo(() => makePath(prefix, "key_length"), [
    prefix,
  ]);
  const digest = React.useMemo(() => makePath(prefix, "digest"), [prefix]);
  const { values, setFieldValue } = useFormikContext();

  React.useLayoutEffect(() => {
    const h = getIn(values, digest, undefined);
    if (typeof h === "undefined") setFieldValue(digest, "sha256", false);
  }, [digest, values]);

  return (
    <>
      <h5 className="no-margin-bottom">RSA Parameters</h5>
      <div className="panel">
        <Field
          component={Input}
          name={keyLength}
          label="RSA Key Length"
          type="number"
        />
        <Field component={Select} title="Digest" name={digest}>
          {Object.keys(DIGESTS).map((d) => (
            <option key={d} value={d}>
              {DIGESTS[d]}
            </option>
          ))}
        </Field>
      </div>
    </>
  );
};

RSA.propTypes = {
  prefix: PropTypes.string.isRequired,
};

const KeyUsage = ({ prefix }) => {
  const { values, setFieldValue } = useFormikContext();
  const localPrefix = React.useMemo(() => makePath(prefix, "key_usage"), [
    prefix,
  ]);
  const shown = React.useMemo(
    () => !!Object.keys(getIn(values, localPrefix, {})).length,
    [localPrefix]
  );

  React.useLayoutEffect(() => {
    Object.keys(KEY_USAGES).forEach((k) => {
      const h = getIn(values, makePath(localPrefix, k), undefined);
      if (typeof h === "undefined")
        setFieldValue(makePath(localPrefix, k), false);
    });
  }, [localPrefix]);

  return (
    <AccordionElement defaultOpen={shown} title="Key Usage" toggles>
      <div className="half-padding-left base-margin-bottom">
        {Object.keys(KEY_USAGES).map((k) => (
          <Field component={Checkbox} name={makePath(localPrefix, k)} key={k}>
            {KEY_USAGES[k]}
          </Field>
        ))}
      </div>
    </AccordionElement>
  );
};

KeyUsage.propTypes = {
  prefix: PropTypes.string.isRequired,
};

const ExtKeyUsage = ({ prefix }) => {
  const { values, setFieldValue } = useFormikContext();
  const localPrefix = React.useMemo(() => makePath(prefix, "ext_key_usage"), [
    prefix,
  ]);
  const shown = React.useMemo(
    () => !!Object.keys(getIn(values, localPrefix, {})).length,
    [localPrefix]
  );

  React.useLayoutEffect(() => {
    Object.keys(EXT_KEY_USAGES).forEach((k) => {
      const h = getIn(values, makePath(localPrefix, k), undefined);
      if (typeof h === "undefined")
        setFieldValue(makePath(localPrefix, k), false);
    });
  }, [localPrefix]);

  return (
    <AccordionElement defaultOpen={shown} title="Extended Key Usage" toggles>
      <div className="half-padding-left base-margin-bottom">
        {Object.keys(EXT_KEY_USAGES).map((k) => (
          <Field component={Checkbox} name={makePath(localPrefix, k)} key={k}>
            {EXT_KEY_USAGES[k]}
          </Field>
        ))}
      </div>
    </AccordionElement>
  );
};

ExtKeyUsage.propTypes = {
  prefix: PropTypes.string.isRequired,
};

const LoadTemplate = ({ prefix }) => {
  const { setFieldValue } = useFormikContext();
  const [templates, setTemplates] = React.useState([]);

  const onOpen = React.useCallback(async () => {
    const r = await loadTemplates();
    if (r.state === "success") {
      setTemplates(r.result);
    }
  }, []);

  const onTemplateClick = React.useCallback(
    (tmpl) => {
      setFieldValue(prefix, tmpl.content, false);
    },
    [prefix]
  );

  return (
    <>
      <hr />
      <Dropdown
        alwaysClose
        header="Load Template"
        type="link"
        onOpen={onOpen}
        className="btn--dropdown"
      >
        <If condition={templates === "loading"}>
          <a>
            <span className="icon-animation spin qtr-margin-right" />
            Loading...
          </a>
        </If>
        <If condition={Array.isArray(templates) && !templates.length}>
          <a>No templates</a>
        </If>
        <If condition={Array.isArray(templates) && templates.length}>
          {templates.map((t) => (
            <a key={t.id} onClick={() => onTemplateClick(t)}>
              {t.friendly_name}
            </a>
          ))}
        </If>
      </Dropdown>
    </>
  );
};

LoadTemplate.propTypes = {
  prefix: PropTypes.string.isRequired,
};

const Template = ({ prefix }) => {
  const { values, setFieldValue } = useFormikContext();

  React.useLayoutEffect(() => {
    const have = getIn(values, prefix);
    if (!have) setFieldValue(prefix, defaultCSR, false);
  }, []);

  return (
    <>
      <div className="row">
        <div className="col">
          <Subject prefix={prefix} />
          <SANs prefix={prefix} />
        </div>
        <div className="col">
          <RSA prefix={prefix} />
          <Accordion>
            <KeyUsage prefix={prefix} />
            <ExtKeyUsage prefix={prefix} />
          </Accordion>
        </div>
      </div>
      <LoadTemplate prefix={prefix} />
    </>
  );
};

Template.propTypes = {
  prefix: PropTypes.string.isRequired,
};

Template.defaultProps = {};

export default Template;
