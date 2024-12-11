const fs = require("fs");
const path = require("path");
const { URL } = require("url"); // Built-in module for parsing URLs

const todoPath = path.join(__dirname, "..", "data", "todoItems.json");

const { loadView, renderView } = require("../utils/loadView");

const route = (req, res, next) => {
  const method = req.method;
  if (method == "GET") {
    getRequestsHandler(req, res, next);
  } else if (method == "POST") {
    postRequestsHandler(req, res, next);
  } else if (method == "DELETE") {
    deleteRequestsHandler(req, res, next);
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

        const modifiedContent = JSON.stringify(parsedItems, null, 4);
        fs.writeFile(todoPath, modifiedContent, (err) => {
          if (err) {
            // Handle file write error
            res.statusCode = 500;
            res.write(
              JSON.stringify({ error: "Failed to update todo item" }, null, 4)
            );
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
  } else if (url === "/api/add-todo-item") {
    console.log("got here!");
    const chunks = [];
    req.on("data", (chunk) => {
      chunks.push(chunk);
    });
    req.on("end", () => {
      const requestBody = Buffer.concat(chunks).toString(); // Combine chunks and convert to string
      console.log(requestBody);
      const params = new URLSearchParams(requestBody);
      const taskData = {
        name: params.get("taskName"),
        description: params.get("taskDescription"),
        status: "pending",
        date: params.get("taskDate"),
      };

      getTodoItems((fileContent) => {
        const parsedItems = JSON.parse(fileContent);
        const newTodoItem = { id: parsedItems.length + 1, ...taskData };
        parsedItems.push(newTodoItem);
        fs.writeFile(todoPath, JSON.stringify(parsedItems, null, 4), (err) => {
          if (err) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "html/text");
            res.write("Couldn't add the new todo item to the list!");
            return res.end();
          } else {
            res.writeHead(303, { Location: "/" }); // Redirect to /success
            return res.end();
          }
        });
      });
    });
  } else {
    console.log("unknown url");
    console.log(url);
    res.writeHead(303, { Location: "/404" });
    return res.end();
  }
};

const deleteRequestsHandler = (req, res, next) => {
  const url = req.url;
  if (url.startsWith("/api/remove-item")) {
    console.log("Deleting an item from the TODO list");

    // Parse the query string to extract the `id` parameter
    const urlObject = new URL(`http://localhost:3000${req.url}`);
    const itemID = parseInt(urlObject.searchParams.get("id"));

    if (isNaN(itemID)) {
      // If the `id` is not a valid number, return an error response
      res.setHeader("Content-Type", "application/json");
      res.write(JSON.stringify({ sucess: false }));
      return res.end();
    } else {
      // If we got here, the id was parsed into an integer successfully
      removeTodoItem(itemID, (result) => {
        res.setHeader("Content-Type", "application/json");
        if (result.success) {
          res.write(JSON.stringify({ success: true }));
        } else {
          res.write(JSON.stringify({ success: false }));
        }
        return res.end(); // End response after the callback
      });
    }
    return; // Ensure no further code in the handler is executed
  }
};

const removeTodoItem = (itemID, callbackFn) => {
  const todoItems = getTodoItems((fileContent) => {
    const parsedItems = JSON.parse(fileContent);
    const processedItems = parsedItems.filter((item) => item.id != itemID);
    const newFileContent = JSON.stringify(processedItems, null, 4);
    fs.writeFile(todoPath, newFileContent, (err) => {
      if (err) {
        callbackFn({ success: false, error: err.message });
      } else {
        callbackFn({ success: true, error: null });
      }
    });
  });
};

module.exports = route;
