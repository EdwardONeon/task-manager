const express = require('express');
const app = express();
const cors = require('cors');

const {mongoose} = require('./db/mongoose');

const bodyParser = require('body-parser');

// Load in the mongoose models 
const {List, Task, User} = require('./db/models');

// Middleware

// Load body-parser middleware
app.use(bodyParser.json());

// Enable CORS
app.use(cors())


// Verify refresh token middleware (which will be verifying the session)
let verifySession = (req, res, next) => {
    // grab the refresh token from the request header
    let refreshToken = req.header('x-refresh-token');

    // grab the _id from the request header
    let _id = req.header('_id');

    User.findByIdAndToken(_id, refreshToken).then((user) => {
        if(!user) {
            // cannot find user
            return Promise.reject({
                'error': 'User not found. Make sure the refresh token and user id are correct'
            });
        }

        // if user is found
        req.user_id = user._id;
        req.refreshToken = refreshToken;
        req.userObject = user;

        let isSessionValid = false;

        user.sessions.forEach((session) => {
            if (session.token === refreshToken) {
                // check if session is expired
                if (User.hasRefreshTokenExpired(session.expiresAt) === false) {
                    // refreshtoken is not expired
                    isSessionValid = true;
                }
            }
        });

        if (isSessionValid) {
            // the session is valid - call next() to continue with processing with this web request
            next();
        } else {
            return Promise.reject({
                'error':'Refresh token has expired or the session is invalid',
                'message': `id is ${_id}`,
                'valid': `Session is ${isSessionValid}`,
                'refresh-token': `${refreshToken}`
            })
        }
    }).catch((e) => {
        res.status(401).send(e);
    });
}

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
        res.send({message: 'updated successfully!'})
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

// User routes
// Add a new user
app.post('/users', (req, res) => {
    // User sign up
    let body = req.body;
    let newUser = new User(body);

    newUser.save().then(() => {
        return newUser.createSession();
    }).then((refreshToken) => {
        // session created successfully and refreshToken returned
        // now generate an access auth token for the user

        return newUser.generateAccessAuthToken().then((accessToken) => {
            //access auth token generated successfully, now we return an object containing the auth tokens
            return {accessToken, refreshToken}
        });
    }).then((authTokens) => {
        res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(newUser);
    }).catch((e) => {
        res.status(400).send(e);
    });
})

// User login
app.post('/users/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    User.findByCredentials(email, password).then((user) => {
        return user.createSession().then((refreshToken) => {
            //session created successfully - refreshToken returned
            // generate an access auth token for the user

            return user.generateAccessAuthToken().then((accessToken) => {
                return {accessToken, refreshToken}
            });
        }).then((authTokens) => {
            res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(user);
        })
    }).catch((e) => {
        res.status(400).send(e);
    });
});

// Generate and returns an access token
app.get('/users/me/access-token', verifySession, (req, res) => {
    // the user is authenticated, user_id and user object is available to us
    req.userObject.generateAccessAuthToken().then((accessToken) => {
        res.header('x-access-token', accessToken).send({accessToken});
    }).catch((e) => {
        res.status(400).send(e);
    });
});
    

app.listen(3000, () => {
    console.log("Server is listening on port 3000");
});