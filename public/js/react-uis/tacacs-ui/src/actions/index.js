import axios from "axios";

export const getTacacsOptions = async () => {
  const response = await axios.get("/tacacs/", {
    headers: { Accept: "application/json" }
  });

  return response.data;
};

export const startTacacs = async values => {
  return axios.post("/tacacs/", values, {
    headers: { Accept: "application/json", "Content-Type": "application/json" }
  });
};
