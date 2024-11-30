const fs = require("fs");
const path = require("path");
const todoPath = path.join(__dirname, "..", "data", "todoItems.json");

const { loadView, renderView } = require("../utils/loadView");

const route = (req, res, next) => {
  const method = req.method;
  if (method == "GET") {
    getRequestsHandler(req, res, next);
  }
  if (method == "POST") {
    postRequestsHandler(req, res, next);
  }
};

const getRequestsHandler = (req, res, next) => {
  const url = req.url;
  if (url == "/") {
    renderView(req, res, "home.html");
  } else if (url == "/add-item") {
    renderView(req, res, "add-item.html");
  } else if (url.startsWith("/api")) {
    handleGetApiCalls(req, res, next);
  } else {
    renderView(req, res, "404.html");
  }
};

const getTodoItems = (callbackFn) => {
  fs.readFile(todoPath, (err, buffer) => {
    if (!err && buffer) {
      const fileContent = buffer.toString();
      callbackFn(fileContent);
    }
  });
};

const handleGetApiCalls = (req, res, next) => {
  const url = req.url;

  if (url == "/api/get-todo-items") {
    getTodoItems((fileContent) => {
      res.setHeader("Content-Type", "application/json");
      res.write(fileContent);
      return res.end();
    });
  } else {
    // Invalid API call - Handle this
    res.statusCode = 404;
    res.write(JSON.stringify({ error: "Invalid API endpoint" }));
    return res.end();
  }
};

const postRequestsHandler = (req, res, next) => {
  const url = req.url;
  console.log("Handling post requests!");
  if (url.startsWith("/api/mark-completed/")) {
    const itemId = url.split("/").pop();
    const parsedId = parseInt(itemId, 10);

    if (isNaN(parsedId) || parsedId <= 0 || !parsedId) {
      // Invalid ID - Handle Invalid API call
      res.statusCode = 400;
      res.write(JSON.stringify({ error: "Invalid ID" }));
      return res.end();
    }

    getTodoItems((fileContent) => {
      const parsedItems = JSON.parse(fileContent);
      const todoItem = parsedItems.find((item) => item.id == parsedId);

      if (todoItem) {
        // Mark the todo item as completed
        todoItem.status = "completed";

        const modifiedContent = JSON.stringify(parsedItems, null, 2); // Pretty print the JSON
        fs.writeFile(todoPath, modifiedContent, (err) => {
          if (err) {
            // Handle file write error
            res.statusCode = 500;
            res.write(JSON.stringify({ error: "Failed to update todo item" }));
            return res.end();
          }

          // Successfully updated the todo item, return a success response
          res.setHeader("Content-Type", "application/json");
          res.statusCode = 200;
          res.write(
            JSON.stringify({
              success: true,
              error: false,
              message: "Item marked as completed",
            })
          );
          return res.end();
        });
      } else {
        // Item not found
        res.statusCode = 404;
        res.write(JSON.stringify({ error: "Todo item not found" }));
        return res.end();
      }
    });
  }
};
module.exports = route;
