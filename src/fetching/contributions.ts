import sumBy from "lodash/sumBy";

export class GraphQLClient {
  readonly endpoint: string;
  private accessToken: string;
  // Simple caching to store already fetched users
  private dataCache: { [username: string]: { [data: string]: unknown } } = {};

  constructor() {
    this.endpoint = "https://api.github.com/graphql";

    // Stored in AWS Systems Manager Parameter Store, retrieved in serverless.yml
    if (!process.env.GITHUB_ACCESS_TOKEN) {
      throw new Error("GITHUB_TOKEN is not set. Cannot create GraphQLClient.");
    }
    this.accessToken = process.env.GITHUB_ACCESS_TOKEN;
  }

  async userContributions(user: string): Promise<Record<string, unknown>> {
    if (this.dataCache[user]) {
      return this.dataCache[user];
    }

    const body = {
      query: `query {
            user(login: "${user}") {
              name
              contributionsCollection {
                contributionCalendar {
                  colors
                  totalContributions
                  weeks {
                    contributionDays {
                      contributionCount
                    }
                    firstDay
                  }
                }
              }
            }
          }`,
    };
    const response = await this.makePostRequest(body);
    if (!response.ok) {
      throw new Error(
        `Error fetching user contributions: ${response.statusText}`
      );
    }
    const data = (await response.json()) as Record<string, unknown>;
    this.dataCache[user] = data;
    return data;
  }

  async weeklyContributions(user: string): Promise<Record<string, unknown>> {
    // TODO: clean up types here. This is gross.
    const contributions = (await this.userContributions(user)) as any;
    const allDays =
      contributions["data"]["user"]["contributionsCollection"][
        "contributionCalendar"
      ]["weeks"];
    const weeklyData = allDays.map((week: any) => ({
      firstDay: week["firstDay"],
      contributionDays: sumBy(week.contributionDays, "contributionCount"),
    }));

    return {
      user,
      name: contributions["data"]["user"]["name"],
      weeklyContributions: weeklyData,
    };
  }

  private async makePostRequest(
    body: Record<string, unknown>,
    headers?: Record<string, string>
  ) {
    if (!headers) {
      headers = {};
    }
    headers["Authorization"] = `bearer ${this.accessToken}`;
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      body: JSON.stringify(body),
      headers: headers,
    });
    return response;
  }
}
