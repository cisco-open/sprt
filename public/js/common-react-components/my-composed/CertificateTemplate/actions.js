import axios from "axios";

const getHeaders = {
  Accept: "application/json",
};

// const updateHeaders = {
//   Accept: "application/json",
//   "Content-Type": "application/json",
// };

export const loadTemplates = async () => {
  const response = await axios.get(`${globals.rest.cert.templates}`, {
    headers: getHeaders,
  });

  return response.data;
};
