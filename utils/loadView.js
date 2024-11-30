const path = require("path");
const fs = require("fs");

// Assuming the views are in the views folder
const loadView = (filename, callbackFn) => {
  const filePath = path.join(__dirname, "..", "views", filename);
  fs.readFile(filePath, (err, data) => {
    let fileContent = data;
    if (!err && data) {
      fileContent = data.toString();
    }
    callbackFn(err, fileContent);
  });
};

const renderView = (req, res, filename) => {
  loadView(filename, (err, fileContent) => {
    if (!err) {
      res.setHeader("Content-Type", "text/html");
      res.write(fileContent);
      return res.end();
    }
  });
};
module.exports = {
  loadView: loadView,
  renderView: renderView,
};
