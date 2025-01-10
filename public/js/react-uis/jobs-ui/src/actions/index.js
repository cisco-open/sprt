import axios from "axios";

export const getJobs = async ({ user }) => {
  const response = await axios.get(
    `${globals.rest.jobs.base}${user ? `user/${user}/` : ""}`,
    {
      headers: { Accept: "application/json" }
    }
  );

  return { ...response.data, _from: "promise" };
};

export const getSomeJobs = async ([jobs], { user }) => {
  const response = await axios.post(
    `${globals.rest.jobs.base}get-jobs/`,
    { jobs },
    {
      headers: { Accept: "application/json" },
      "Content-Type": "application/json"
    }
  );

  return { ...response.data, _from: "defer" };
};

export const getUpdate = async (known_jobs, update_jobs, user) => {
  const response = await axios.post(
    `${globals.rest.jobs.base}update/`,
    { known_jobs, update_jobs, user },
    {
      headers: { Accept: "application/json" },
      "Content-Type": "application/json"
    }
  );

  return response.data;
};

export const getJobIds = async user => {
  const response = await axios.get(
    `${globals.rest.jobs.all}${user ? `?user=${user}` : ""}`,
    {
      headers: { Accept: "application/json" }
    }
  );

  return response.data;
};

export const getUsers = async () => {
  const response = await axios.get(
    `${globals.rest.jobs.base}all-users/?${+new Date()}`,
    {
      headers: { Accept: "application/json" }
    }
  );

  return response.data;
};

export const removeJobs = async (jobs, user) => {
  const response = await axios.delete(
    `${globals.rest.jobs.manipulate}list/?user=${user}`,
    {
      data: { jobs },
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    }
  );

  return response.data;
};

export const repeatJobs = async (jobs, user) => {
  let responses = await Promise.all(
    jobs.map(jid =>
      axios
        .put(`${globals.rest.jobs.manipulate}${jid}/?user=${user}`, undefined, {
          headers: { Accept: "application/json" }
        })
        .then(res => ({ ...res, id: jid }))
        .catch(error => ({ ...error, id: jid }))
    )
  );

  let results = {
    status: "multi",
    ok: [],
    notok: []
  };

  responses.forEach(res => {
    if (res.data && res.data.status === "ok") results.ok.push(res.id);
    else results.notok.push(res.id);
  });

  return results;
};

export const stopJobs = async jobs => {
  let responses = await Promise.all(
    jobs.map(jid =>
      axios
        .put(`${globals.rest.jobs.manipulate}${jid}/stop/`, undefined, {
          headers: { Accept: "application/json" }
        })
        .then(res => ({ ...res, id: jid }))
        .catch(error => ({ ...error, id: jid }))
    )
  );

  let results = {
    status: "multi",
    ok: [],
    notok: []
  };

  responses.forEach(res => {
    if (res.data && res.data.status === "ok") results.ok.push(res.id);
    else results.notok.push(res.id);
  });

  return results;
};

export const getStats = async ([job], { user }) => {
  const response = await axios.get(
    `${globals.rest.jobs.manipulate}${job}/charts/${
      user ? `?user=${user}` : ""
    }`,
    {
      headers: { Accept: "application/json" }
    }
  );

  return response.data;
};

export const removeCron = async cron => {
  const response = await axios.delete(`${globals.rest.jobs.base}cron/`, {
    data: { line: cron.line, command: cron.command },
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    }
  });

  return response.data;
};
