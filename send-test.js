const http = require("http");
const data = JSON.stringify({
  tileType: "manim",
  nodeId: "manim-test-111",
  config: { quality: "l", format: "mp4", script: "circle=Circle()\nself.play(Create(circle))" },
  inputs: {}
});
const req = http.request("http://localhost:3000/api/execute", { method: "POST", headers: { "Content-Type": "application/json" } }, res => {
  res.on("data", d => process.stdout.write(d));
});
req.write(data); req.end();
