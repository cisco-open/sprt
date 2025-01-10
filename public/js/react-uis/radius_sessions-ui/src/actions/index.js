import axios from "axios";

const DUMMY_SERVER = {
  server: [
    {
      server: "NOT_LOADED",
      bulks: "NOT_LOADED",
    },
  ],
};

const basicHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

export const getServerBulks = async ({ server }) => {
  if (!server) return DUMMY_SERVER;
  const response = await axios.get(
    `${globals.rest.sessions}server/radius/${server}/`,
    {
      headers: { Accept: "application/json" },
    }
  );

  return response.data;
};

const definedNotNull = (...args) =>
  args.every((v) => typeof v !== "undefined" && v !== null);

const pagingAttributes = [
  ({ column, order }) =>
    definedNotNull(column, order) ? `sort/${column}-${order}/` : "",
  ({ limit }) => (definedNotNull(limit) ? `per-page/${limit}/` : ""),
  ({ offset }) => (definedNotNull(offset) ? `offset/${offset}/` : ""),
  ({ filter }) => (definedNotNull(filter) ? `filter/${filter}/` : ""),
];
const addPaging = (paging) => pagingAttributes.map((f) => f(paging)).join("");

export const getBulkSessions = async ([paging], { server, bulk }) => {
  if (!bulk || !server) return [];

  const pag = paging && Object.keys(paging).length ? addPaging(paging) : "";

  const response = await axios.get(
    `${globals.rest.sessions}server/radius/${server}/bulk/${bulk}/${
      pag.length ? `${pag}` : ""
    }`,
    {
      headers: { Accept: "application/json" },
    }
  );

  return response.data;
};

export const deleteSessions = async (server, bulk, what) => {
  if (!bulk || !server) return [];

  const response = await axios.delete(
    `${globals.rest.sessions}server/radius/${server}/bulk/${bulk}/`,
    {
      data: {
        "delete-session": Array.isArray(what)
          ? `array:${what.join(",")}`
          : what,
      },
      headers: basicHeaders,
    }
  );

  return response.data;
};

export const getSessionFlow = async ([{ server, bulk, id }]) => {
  const response = await axios.get(
    `${globals.rest.sessions}server/radius/${server}/bulk/${bulk}/session-flow/${id}/`,
    {
      headers: { Accept: "application/json" },
    }
  );

  return response.data;
};

export const getSessionDacl = async ([{ server, bulk, id }]) => {
  const response = await axios.get(
    `${globals.rest.sessions}server/radius/${server}/bulk/${bulk}/session-dacl/${id}/`,
    {
      headers: { Accept: "application/json" },
    }
  );

  return response.data;
};

export const getCertificate = async ([{ certificate, type }]) => {
  // https://sprt.cisco.com/cert/details/02f4e786-f5a5-11e9-bd09-005056991f1a/
  if (!certificate) return null;

  const response = await axios.post(
    `${globals.rest.cert.details}${certificate}/`,
    { type },
    {
      headers: basicHeaders,
    }
  );

  return response.data;
};

export const updateSessions = async (server, bulk, data) => {
  const response = await axios.patch(
    `${globals.rest.sessions}server/${server}/bulk/${bulk}/update/`,
    data,
    {
      headers: basicHeaders,
    }
  );

  return response.data;
};

export const dropSessions = async (server, bulk, data) => {
  const response = await axios.patch(
    `${globals.rest.sessions}server/${server}/bulk/${bulk}/drop/`,
    data,
    {
      headers: basicHeaders,
    }
  );

  return response.data;
};

export const checkSessions = async (server, bulk, data) => {
  const response = await axios.post(
    `${globals.rest.sessions}server/${server}/bulk/${bulk}/check/`,
    data,
    {
      headers: basicHeaders,
    }
  );

  return response.data;
};

export const getServers = async () => {
  const response = await axios.get(`${globals.rest.sessions}servers/`, {
    headers: { Accept: "application/json" },
  });

  return response.data;
};

export const getGuestData = async ([sessions], { server, bulk }) => {
  const response = await axios.post(
    `${globals.rest.sessions}server/${server}/bulk/${bulk}/get-guest-creds/`,
    { sessions },
    {
      headers: basicHeaders,
    }
  );

  return response.data;
};
