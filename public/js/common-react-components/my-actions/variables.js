import axios from "axios";

import { getHeaders, updateHeaders } from "./headers";

export const loadAttribute = async ({ attribute }) => {
  const res = await axios.get(
    `${globals.rest.generate}get-attribute-data/${attribute}/`,
    {
      params: { _: new Date().getTime() },
      headers: getHeaders,
    }
  );
  return res.data;
};

export const loadValues = async ({ from }) => {
  var href = globals.rest.generate;

  var a_p = {
    url: href,
    method: "POST",
    headers: updateHeaders,
  };

  if (from.hasOwnProperty("link")) {
    a_p.method = "GET";
    if (from.nolocation) {
      a_p.url = from.link;
    } else {
      if (a_p.url[a_p.url.length - 1] == "/" && from.link[0] == "/") {
        a_p.url = a_p.url.slice(0, -1);
      }
      a_p.url += from.link;
    }
  } else {
    var postData = {};
    postData[from.call] = from.value;
    a_p.data = JSON.stringify(postData);
  }

  const res = await axios(a_p);
  return res.data;
};

export const deferLoadValues = async (_, props) => loadValues(props);

export const loadValueFromLink = async (data) => {
  var a_p = {
    headers: updateHeaders,
  };

  if (data.api) {
    var postData = { [data.api.call]: data.api.parameters };
    var href = window.location.pathname + "?ajax=1";
    a_p.url = href;
    a_p.data = JSON.stringify(postData);
    a_p.method = "POST";
  } else if (data.link) {
    a_p.url = data.link;
    a_p.method = "GET";
  }

  const res = await axios(a_p);
  return res.data;
};

export const loadSelectValues = async (parameters) => {
  const res = axios({
    url: parameters.link,
    method: parameters.method || "GET",
    data: parameters.request ? JSON.stringify(parameters.request) : undefined,
    headers: updateHeaders,
  });

  return res.data[parameters.result.attribute].map((attr) => ({
    value: attr[parameters.result.fields.id],
    label: attr[parameters.result.fields.name],
  }));
};
