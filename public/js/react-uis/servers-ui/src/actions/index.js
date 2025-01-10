import axios from "axios";

export const loadServers = async () => {
  const res = await axios.get(`${globals.rest.servers.base}`, {
    params: { all: 1 },
    headers: { Accept: "application/json" },
  });

  return res.data;
};

export const loadServersDropdown = async () => {
  const res = await axios.get(`${globals.rest.servers.dropdown}`, {
    params: { _: new Date().getTime() },
    headers: { Accept: "application/json" },
  });

  return res.data;
};

export const saveServer = async ({ id, ...server }) => {
  const res = await axios.post(
    `${globals.rest.servers.server}${id}/`,
    { server },
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  return res.data;
};

export const deleteServer = async ({ id }) => {
  await axios.delete(globals.rest.servers.base, {
    data: { servers: `id:${id}` },
    headers: { Accept: "application/json", "Content-Type": "application/json" },
  });
};
