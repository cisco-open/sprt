import axios from "axios";

const base64 =
  "(?:[A-Za-z0-9\n\r+/]{4})*(?:[A-Za-z0-9\n\r+/]{2}==|[A-Za-z0-9\n\r+/]{3}=)[\n\r]*";
const certReg = new RegExp(
  `-----BEGIN CERTIFICATE-----${base64}-----END CERTIFICATE-----`,
  "mg"
);

const pvkHeaders = [
  "ANY PRIVATE KEY",
  "RSA PRIVATE KEY",
  "DSA PRIVATE KEY",
  "ENCRYPTED PRIVATE KEY",
  "PRIVATE KEY",
  "EC PRIVATE KEY"
].join("|");
const pvkReg = new RegExp(
  `-----BEGIN (${pvkHeaders})-----${base64}-----END (${pvkHeaders})-----`
);

export const validate = values => {
  let err = {};
  if (!values.clientName) {
    err.clientName = "Client name is required";
  }

  if (values.clientName) {
    if (
      values.clientName.length > 50 ||
      !/^[a-z0-9_.-]+$/i.test(values.clientName)
    ) {
      err.clientName =
        "Client name has a limit of 50 characters. It can contain alphanumberics (a-z, 0-9), dashes (-), underscores (_), and periods (.)";
    }
  }

  if (!values.primaryFqdn) {
    err.primaryFqdn = "FQDN of a primary pxGrid node is required";
  }

  if (values.authenticationType) {
    if (!values.clientCertificate || values.clientCertificate.length === 0) {
      err.clientCertificate = "Client certificate is required";
    }

    if (!values.clientPrivateKey || values.clientPrivateKey.length === 0) {
      err.clientPrivateKey = "Private key is required";
    }
  }

  if (values.verify !== "none") {
    if (
      !values.serverCertificateChain ||
      !values.serverCertificateChain.length
    ) {
      err.serverCertificateChain = "Server CA chain is required";
    }
  }

  let m;
  if (typeof values.clientCertificate === "string") {
    m = values.clientCertificate.match(certReg);
    if (!m || !m.length) {
      err.clientCertificate = "Did not find any valid PEM certificate";
    }
  }

  if (typeof values.clientPrivateKey === "string") {
    m = values.clientPrivateKey.match(pvkReg);
    if (!m || !m.length) {
      err.clientPrivateKey = "Did not find any valid PEM private key";
    } else {
      if (
        m[0].match("-----BEGIN ENCRYPTED PRIVATE KEY-----") &&
        !values.clientPvkPassword
      ) {
        err.clientPvkPassword =
          "Password must be specified for an encrypted private key";
      }
    }
  }

  return err;
};

export const asyncValidate = async (values, dispatch, props) => {
  if (props.page === 1) {
    return await asyncValidateFirst(values);
  }

  // if (props.page === 2) {
  //     const { clientCertificate, clientPrivateKey, clientPvkPassword } = values;
  //     if (clientCertificate && Array.isArray(clientCertificate) && clientCertificate.length) {
  //         await validateClientCert(clientCertificate[0]);
  //     }
  //     if (clientPrivateKey && Array.isArray(clientPrivateKey) && clientPrivateKey.length) {
  //         await validateClientPvk(clientPrivateKey[0], clientPvkPassword);
  //     }
  // }
};

const asyncValidateFirst = async values => {
  if (values.primaryFqdn) {
    try {
      let response = await axios.post(
        "/pxgrid/connections/check-fqdn",
        {
          fqdn: values.primaryFqdn,
          dns: values.dns
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          }
        }
      );

      if (
        response.status < 200 ||
        response.status >= 300 ||
        response.data.error
      ) {
        if (response.data.error.dns) {
          throw { dns: response.data.error.dns };
        }

        if (response.data.error.fqdn) {
          throw { primaryFqdn: response.data.error.fqdn };
        }
      }
    } catch (e) {
      if (e.message) {
        throw { primaryFqdn: e.message };
      } else {
        throw e;
      }
    }
  }
};

const readSingleFile = file => {
  return new Promise(resolve => {
    var r = new FileReader();
    r.onload = function(e) {
      var contents = e.target.result;
      resolve(contents);
    };
    r.readAsText(file);
  });
};

const validateClientCert = async cert => {
  const content = await readSingleFile(cert);
  let m = content.match(certReg);
  if (!m || !m.length) {
    throw { clientCertificate: "Did not find any valid PEM certificate" };
  }
};

const validateClientPvk = async (pvk, clientPvkPassword) => {
  const content = await readSingleFile(pvk);
  let m = content.match(pvkReg);
  if (!m || !m.length) {
    throw { clientPrivateKey: "Did not find any valid PEM private key" };
  } else {
    if (
      m[0].match("-----BEGIN ENCRYPTED PRIVATE KEY-----") &&
      !clientPvkPassword
    ) {
      throw {
        clientPvkPassword:
          "Password must be specified for an encrypted private key"
      };
    }
  }
};
