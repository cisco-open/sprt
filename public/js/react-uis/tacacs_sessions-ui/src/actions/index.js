import axios from "axios";

const DUMMY_SERVER = {
  server: [
    {
      server: "NOT_LOADED",
      bulks: "NOT_LOADED"
    }
  ]
};

export const getServerBulks = async ({ server }) => {
  if (!server) return DUMMY_SERVER;
  const response = await axios.get(
    `${globals.rest.tacacs_sessions}${server}/`,
    {
      headers: { Accept: "application/json" }
    }
  );

  return response.data;
};

export const getBulkSessions = async ([paging], { server, bulk }) => {
  if (!bulk || !server) return [];

  const pag =
    paging && Object.keys(paging).length
      ? Object.keys(paging)
          .filter(
            k =>
              typeof paging[k] !== "undefined" &&
              paging[k] !== null &&
              !["total", "pages"].includes(k)
          )
          .map(k => `${k}/${paging[k]}`)
          .join("/")
      : "";

  const response = await axios.get(
    `${globals.rest.tacacs_sessions}${server}/bulk/${bulk}/${
      pag.length ? `${pag}/` : ""
    }`,
    {
      headers: { Accept: "application/json" }
    }
  );

  return response.data;
};

export const deleteSessions = async (server, bulk, what) => {
  if (!bulk || !server) return [];

  const response = await axios.delete(
    `${globals.rest.tacacs_sessions}${server}/bulk/${bulk}/`,
    {
      data: { what: Array.isArray(what) ? `array:${what.join(",")}` : what },
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    }
  );

  return response.data;
};

export const getSessionFlow = async ([], { server, bulk, id }) => {
  const response = await axios.get(
    `${globals.rest.tacacs_sessions}${server}/bulk/${bulk}/session-flow/${id}/`,
    {
      headers: { Accept: "application/json" }
    }
  );

  return response.data;
};
