const express = require('express');
const app = express();
const cors = require('cors');

const {mongoose} = require('./db/mongoose');

const bodyParser = require('body-parser');

// Load in the mongoose models 
const {List, Task} = require('./db/models');

// Load body-parser middleware
app.use(bodyParser.json());

// Enable CORS
app.use(cors());

// Route Handlers
// List Routes

// Get all lists
app.get('/lists', (req, res) => {
    // Return an array of all the lists in the database
    List.find({}).then((lists) => {
        res.send(lists);
    });
});

// Create a new list
app.post('/lists', (req, res) => {
    // Create a new list and return the new list back to the user
    // The list information will be passed in the JSON request body
    let newList = new List({
        title: req.body.title
    });
    newList.save().then((listDoc) => {
        res.send(listDoc)
    });
})

// Update a specified list
app.patch('/lists/:listId', (req, res) => {
    // Update the specifiled list (list document with id in the URL) with the new values in the JSON body of the request
    List.findOneAndUpdate({_id: req.params.listId}, {
        $set: req.body
    }).then(() => {
        res.sendStatus(200);
    });
});

// Delete a list
app.delete('/lists/:listId', (req, res) => {
    // Delete the specified list (document with id in the URL)
    List.findOneAndRemove({_id: req.params.listId}).then((removedListDoc) => {
        res.send(removedListDoc)
    });
});

// Get all tasks inside a list
app.get('/lists/:listId/tasks', (req, res) => {
    Task.find({
        _listId: req.params.listId
    }).then((tasks) => {
        res.send(tasks);
    });
});

// Find a task in a list
app.get('/lists/:listId/tasks/:taskId', (req, res) => {
    Task.findOne({
        _id: req.params.taskId,
        _listId: req.params.listId
    }).then((task) => {
        res.send(task);
    });
})
// Create a new task in a list 
app.post('/lists/:listId/tasks', (req, res) => {
    let newTask = new Task({
        title: req.body.title,
        _listId: req.params.listId
    });
    newTask.save().then((newTaskDoc) => {
        res.send(newTaskDoc);
    });
});

// Update an existing task
app.patch('/lists/:listId/tasks/:taskId', (req, res) => {
    Task.findOneAndUpdate({
        _id: req.params.taskId,
        _listId: req.params.listId
    }, { $set: req.body }).then(() => {
        res.sendStatus(200);
    });
});

// Delete an existing task
app.delete('/lists/:listId/tasks/:taskId', (req, res) => {
    Task.findOneAndRemove({
        _id: req.params.taskId,
        _listId: req.params.listId
    }).then((removedTaskDoc) => {
        res.send(removedTaskDoc);
    });
});

app.listen(3000, () => {
    console.log("Server is listening on port 3000");
});