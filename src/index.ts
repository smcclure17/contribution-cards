import serverless from "serverless-http";
import express from "express";
import { GraphQLClient } from "./fetching/contributions";

const app = express();
const graphqlClient = new GraphQLClient();

app.get("/:user", (req, res) => {
  graphqlClient
    .weeklyContributions(req.params.user)
    .then((data) => {
      return res.status(200).json(data);
    })
    .catch((err) => {
      // TODO: Don't expose internal errors to client.
      return res.status(500).json({ error: err });
    });
});

app.get("/hello", (req, res) => {
  return res.status(200).json({
    message: "Hello from path!",
  });
});

module.exports.handler = serverless(app);
