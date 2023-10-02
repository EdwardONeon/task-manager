const express = require('express');
const app = express();

const {mongoose} = require('./db/mongoose');

const bodyParser = require('body-parser');

// Load in the mongoose models 
const {List, Task} = require('./db/models')

// Load body-parser middleware
app.use(bodyParser.json());

// Route Handlers
// List Routes

// Get all lists
app.get('/lists', (req, res) => {
    // Return an array of all the lists in the database
    List.find({}).then((lists) => {
        res.send(lists);
    })
})

// Create a new list
app.post('/lists', (req, res) => {
    // Create a new list and return the new list back to the user
    // The list information will be passed in the JSON request body
    
    let newList = new List({
        title: req.body.title
    });
    newList.save().then((listDoc) => {
        res.send(listDoc)
    })
})

// Update a specified list
app.patch('/lists/:id', (req, res) => {
    // Update the specifiled list (list document with id in the URL) with the new values in the JSON body of the request
    
})

// Delete a list
app.delete('/lists/:id', (req, res) => {
    // Delete the specified list (document with id in the URL)
})

app.listen(3000, () => {
    console.log("Server is listening on port 3000");
})