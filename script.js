import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

const data = new SharedArray("Exames", function () {
  return JSON.parse(open("./datasets/data.json"));
});

export let options = {
  vus: 6,
  duration: "3m",
};

export default function () {
  const numDataItems = data.length;

  // Ensure each iteration gets a unique index
  const index = __VU - 1 + __ITER * options.vus;

  // Stop if the index exceeds the number of data items
  if (index >= numDataItems) {
    return;
  }

  const exame = data[index];

  const requestBody = {
    idExame: exame.idExame,
    idLaudo: exame.idLaudo,
  };

  const url = `${__ENV.API_ENDPOINT}`;
  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  let res = http.post(url, JSON.stringify(requestBody), params);

  check(res, {
    "Response time menor de 5s": (r) => r.timings.duration < 4000,
    'Todas requests com "Sucesso" status': (r) => {
      try {
        let responseBody = JSON.parse(r.body);
        if (responseBody.status !== "Sucesso") {
          console.log(
            `Falha na request: ${exame.idExame} - ${responseBody.status}`
          );
          return false;
        } else {
          return true;
        }
      } catch (error) {
        console.error(`Error parsing JSON: ${error}`);
        return false;
      }
    },
  });

  console.log(
    `VU ${__VU} Request: idExame - ${exame.idExame} idLaudo: - ${exame.idLaudo}`
  );

  sleep(1);
}

export function handleSummary(data) {
  return {
    "summary.html": htmlReport(data),
  };
}
