import axios from "axios";

export const fetchConnections = async () => {
  const response = await axios.get("/pxgrid/connections/get-connections", {
    headers: { Accept: "application/json" }
  });

  return response.data;
};

export const fetchGetPolicies = async connection => {
  const response = await axios.post(
    `/pxgrid/connections/${connection}/service/com.cisco.ise.config.anc/getPolicies`,
    [],
    {
      headers: { Accept: "application/json" }
    }
  );

  return response.data;
};

export const fetchGetEndpointByMac = async (connection, mac) => {
  const response = await axios.post(
    `/pxgrid/connections/${connection}/service/com.cisco.ise.config.anc/getEndpointByMac`,
    [mac],
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    }
  );

  return response.data;
};

export const fetchGetPolicyByName = async (connection, policyName) => {
  const response = await axios.post(
    `/pxgrid/connections/${connection}/service/com.cisco.ise.config.anc/getPolicyByName`,
    [policyName],
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    }
  );

  return response.data;
};

export const applyEndpointByIp = async (connection, ip, policyName) => {
  const response = await axios.post(
    `/pxgrid/connections/${connection}/service/com.cisco.ise.config.anc/applyEndpointByIp`,
    [ip, policyName],
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    }
  );

  return response.data;
};

export const applyEndpointByMac = async (connection, mac, policyName) => {
  const response = await axios.post(
    `/pxgrid/connections/${connection}/service/com.cisco.ise.config.anc/applyEndpointByMac`,
    [mac, policyName],
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    }
  );

  return response.data;
};

export const clearEndpointByIp = async (connection, ip, policyName) => {
  const response = await axios.post(
    `/pxgrid/connections/${connection}/service/com.cisco.ise.config.anc/clearEndpointByIp`,
    [ip, policyName],
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    }
  );

  return response.data;
};

export const clearEndpointByMac = async (connection, mac, policyName) => {
  const response = await axios.post(
    `/pxgrid/connections/${connection}/service/com.cisco.ise.config.anc/clearEndpointByMac`,
    [mac, policyName],
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    }
  );

  return response.data;
};
