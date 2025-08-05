import axios from "axios";

const callContent = async ({ count }) => {
  try {
    const res = await axios.get("http://localhost:5000/api/v1/web-configs/event-banners/all");
    console.log(count, " ", res.status);
  } catch (err) {
    console.error("Failed", err?.status, " ", err?.response?.data);
  }
};

const runLoop = async () => {
  let count = 0;
  while (true) {
    await callContent({ count });
    count++;
    // await new Promise((resolve) => {
    //     console.log("wait..");
    //     setTimeout(resolve, 3000);
    // })
  }
};

runLoop();
