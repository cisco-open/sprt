import React from "react";
import PropTypes from "prop-types";
import { getIn } from "formik";
import { SwitchTransition } from "react-transition-group";

import { Fade } from "../animations";

const extKeyUsages = {
  "1.3.6.1.4.1.311.21.6": "Key Recovery Agent",
  "1.3.6.1.4.1.311.20.2.1": "Certificate Request Agent",
  "1.3.6.1.4.1.311.10.3.1": "Microsoft Trust List Signing",
  "1.3.6.1.4.1.311.10.3.3": "Microsoft Server Gated Crypto (SGC)",
  "1.3.6.1.4.1.311.10.3.4": "Encrypting File System",
  "1.3.6.1.5.5.7.3.7": "IP Security User",
  "1.3.6.1.5.5.7.3.6": "IP Security Tunnel Termination",
  "1.3.6.1.5.5.7.3.5": "IP Security End System",
  "1.3.6.1.5.5.7.3.8": "Timestamping",
  "1.3.6.1.5.5.7.3.9": "OCSP Signing",
  serverAuth: "SSL/TLS Web Server Authentication",
  clientAuth: "SSL/TLS Web Client Authentication",
  codeSigning: "Code signing",
  emailProtection: "E-mail Protection (S/MIME)",
  timeStamping: "Trusted Timestamping",
  msCodeInd: "Microsoft Individual Code Signing (authenticode)",
  msCodeCom: "Microsoft Commercial Code Signing (authenticode)",
  msCTLSign: "Microsoft Trust List Signing",
  msSGC: "Microsoft Server Gated Crypto",
  msEFS: "Microsoft Encrypted File System",
  nsSGC: "Netscape Server Gated Crypto",
};

const keyUsages = {
  digitalSignature: "Digital Signature",
  nonRepudiation: "Non Repudiation",
  keyEncipherment: "Key Encipherment",
  dataEncipherment: "Data Encipherment",
  keyAgreement: "Key Agreement",
  keyCertSign: "Certificate Signing",
  cRLSign: "CRL Signing",
  encipherOnly: "Encipher Only",
  decipherOnly: "Decipher Only",
};

const sanTypes = {
  otherName: "Other Name",
  rfc822Name: "RFC822 Name",
  dNSName: "DNS Name",
  x400Address: "X.400 Address",
  directoryName: "Directory Name",
  ediPartyName: "ediPartyName",
  uniformResourceIdentifier: "Uniform Resource Identifier",
  iPAddress: "IP Address",
  registeredID: "registeredID",
};

const dispatch = {
  subject: (v) => v.reverse().join(", "),
  issuer: (v) => v.reverse().join(", "),
  keyusage: (v) =>
    v.map((n) => (keyUsages[n] ? `${keyUsages[n]} (${n})` : n)).join(", "),
  extkeyusage: (v) =>
    v
      .map((n) => (
        <React.Fragment key={n}>
          {extKeyUsages[n] ? `${extKeyUsages[n]} (${n})` : n}
        </React.Fragment>
      ))
      .reduce(
        (acc, x, idx) =>
          acc === null ? [x] : [...acc, <br key={`br-${idx}`} />, x],
        null
      ),
  basicconstraints: (v) => {
    const r = {
      ca: false,
      path: "None",
    };
    v.forEach((e) => {
      const a = e.split("=", 2);
      a[0] = a[0].trim();
      a[1] = a[1].trim();
      if (a[0].toLowerCase() === "ca") {
        // eslint-disable-next-line prefer-destructuring
        r.ca = a[1];
      } else {
        // eslint-disable-next-line prefer-destructuring
        r.path = a[1];
      }
    });
    return (
      <>
        {"Subject Type = "}
        {r.ca ? "CA" : "End Entity"}
        <br />
        {"Path Length Constraint = "}
        {r.path}
      </>
    );
  },
  san: (v) =>
    v
      .map((n) => {
        // eslint-disable-next-line prefer-const
        let [name, val] = n.split("=", 2);
        if (name === "iPAddress") {
          val = `${val.charCodeAt(0)}.${val.charCodeAt(1)}.${val.charCodeAt(
            2
          )}.${val.charCodeAt(3)}`;
        }
        return `${sanTypes[name]} = ${val}`;
      })
      .reduce((acc, x) => (acc === null ? [x] : [acc, <br />, x]), null),
};

const x509FieldsOrder = [
  {
    type: "basic",
    header: "Basic Fields",
    attributes: [
      {
        path: "version",
        value: (cert) => getIn(cert, "version", null),
        header: "Version",
      },
      {
        path: "serial",
        value: (cert) => getIn(cert, "serial", null),
        header: "Serial number",
      },
      {
        path: "signature.encalg",
        value: (cert) => getIn(cert, "signature.encalg", null),
        header: "Signature encryption algorithm",
      },
      {
        path: "signature.hashalg",
        value: (cert) => getIn(cert, "signature.hashalg", null),
        header: "Signature hashing algorithm",
      },
      {
        path: "issuer",
        value: (cert) => getIn(cert, "issuer", null),
        header: "Issuer",
      },
      {
        path: "notBefore",
        value: (cert) => getIn(cert, "notBefore", null),
        header: "Valid from",
      },
      {
        path: "notAfter",
        value: (cert) => getIn(cert, "notAfter", null),
        header: "Valid till",
      },
      {
        path: "subject",
        value: (cert) => getIn(cert, "subject", null),
        header: "Subject",
      },
      {
        path: null,
        value: (cert) => {
          const alg = getIn(cert, "pubkey.alg", null);
          const size = getIn(cert, "pubkey.size", null);
          if (!alg || !size) return null;
          return `${alg} (${size} bits)`;
        },
        header: "Public key",
      },
    ],
  },
  {
    type: "extensions",
    header: "Extensions",
    attributes: [
      {
        path: "aki",
        value: (cert) => getIn(cert, "aki", null),
        header: "Authority key identifier",
      },
      {
        path: "ski",
        value: (cert) => getIn(cert, "ski", null),
        header: "Subject key identifier",
      },
      {
        path: "extkeyusage",
        value: (cert) => getIn(cert, "extkeyusage", null),
        header: "Extended key usage",
      },
      {
        path: "san",
        value: (cert) => getIn(cert, "san", null),
        header: "Subject alternative names",
      },
      {
        path: "keyusage",
        value: (cert) => getIn(cert, "keyusage", null),
        header: "Key usage",
      },
      {
        path: "basicconstraints",
        value: (cert) => getIn(cert, "basicconstraints", null),
        header: "Basic constraints",
      },
    ],
  },
];

const CertTreeContext = React.createContext({});

const buildExt = (name, values) => {
  if (name in dispatch) {
    let vTemp;
    if (values[0] === "critical") {
      vTemp = values.slice(1);
    } else {
      vTemp = values.slice();
    }
    return dispatch[name](vTemp);
  }
  return null;
};

const X509Attributes = ({ field, cert }) => {
  const attributes = React.useMemo(
    () =>
      field.attributes
        .map(({ value, path, header }) => {
          let d = value(cert);
          let critical = false;
          if (Array.isArray(d)) {
            if (d[0] === "critical") critical = true;
            d = buildExt(path, d);
          }
          if (!d) return null;
          return (
            <React.Fragment key={path || header}>
              <dt>
                {critical ? (
                  <span
                    className="icon-circle text-warning qtr-margin-right"
                    title="Critical"
                  />
                ) : null}
                {header}
              </dt>
              <dd>{d}</dd>
            </React.Fragment>
          );
        })
        .filter((v) => !!v),
    [field.attributes, cert]
  );

  if (!attributes) return null;

  return (
    <div className="panel">
      <h4>{field.header}</h4>
      <dl className="dl--inline-wrap dl--inline-centered">{attributes}</dl>
    </div>
  );
};

X509Attributes.propTypes = {
  field: PropTypes.shape({
    attributes: PropTypes.arrayOf(PropTypes.any),
    header: PropTypes.string,
  }).isRequired,
  cert: PropTypes.shape({}).isRequired,
};

const Cert = () => {
  const { chain, active } = React.useContext(CertTreeContext);

  return (
    <SwitchTransition>
      <Fade key={active} appear>
        <div className="certificate-data">
          {x509FieldsOrder.map((field) => (
            <X509Attributes
              field={field}
              cert={chain[active]}
              key={field.header}
            />
          ))}
        </div>
      </Fade>
    </SwitchTransition>
  );
};

const CertHead = ({ idx }) => {
  const { chain, active, onChange } = React.useContext(CertTreeContext);

  const realIdx = chain.length - 1 - idx;
  const cert = chain[realIdx];

  if (typeof cert === "object") {
    return (
      <>
        {cert.root ? (
          <span
            className="icon-software-certified text-primary qtr-margin-right"
            title="Root"
          />
        ) : null}
        {idx > 0 ? (
          <span className="text-muted qtr-margin-right">&#9495;</span>
        ) : null}
        <a
          className={`link cert-selector${
            active === realIdx ? " text-secondary selected" : ""
          }`}
          onClick={() => onChange(realIdx)}
        >
          {cert.subject.join(", ")}
        </a>
      </>
    );
  }

  if (cert === "no-root") {
    return (
      <>
        <span className="icon-exclamation-triangle text-warning qtr-margin-right" />
        <span>Root certificate not found</span>
      </>
    );
  }

  return null;
};

CertHead.propTypes = {
  idx: PropTypes.number.isRequired,
};

const CertTree = ({ idx = 0 }) => {
  const { chain, active, onChange } = React.useContext(CertTreeContext);

  if (!Array.isArray(chain) || !chain.length || chain.length <= idx)
    return null;

  return (
    <>
      <ul className="list">
        <li className="panel panel--compressed">
          <CertHead idx={idx} />
          <CertTree
            chain={chain}
            active={active}
            onChange={onChange}
            idx={idx + 1}
          />
        </li>
      </ul>
    </>
  );
};

CertTree.propTypes = {
  idx: PropTypes.number,
};

CertTree.defaultProps = {
  idx: 0,
};

const Certificates = ({ chain }) => {
  const [active, setActive] = React.useState(0);
  return (
    <CertTreeContext.Provider
      value={{
        chain,
        onChange: (selected) => setActive(selected),
        active,
      }}
    >
      <CertTree />
      <Cert />
    </CertTreeContext.Provider>
  );
};

Certificates.propTypes = {
  chain: PropTypes.arrayOf(PropTypes.any).isRequired,
};

export default Certificates;
