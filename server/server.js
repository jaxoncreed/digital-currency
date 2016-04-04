var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var twilio = require('twilio');
var _ = require('lodash');

// Initialize the Database
var mongoose = require('mongoose');
var User = require('./userModel');
var users = require('./users.json');
mongoose.connect('mongodb://localhost/eleni');

User.find(function(err, existingUsers) {
  users.forEach(function(user) {
    if (_.findIndex(existingUsers, { name: user.name }) < 0) {
      user.amount = 0;
      var userObj = new User(user);
      userObj.save(function(err) {
        if (err) {
          console.log(err);
        }
      });
    }
  });
});

// Error Handling
var error = function(res, message) {
  var twilml = new twilio.TwimlResponse();
  twilml.message('Error: ' + message);
  res.send(twilml.toString());
}

//Paths
app.use(bodyParser.urlencoded({ extended: false }));

app.post('/transact', function(req, res) {
  User.find(function(err, users) {
    // Get the sender
    var sender;
    var senderIndex = _.findIndex(users, { number: req.body.From });
    if (senderIndex >= 0) {
      sender = users[senderIndex];
    } else {
      error(res, 'Sorry, you\'re not in the community.');
      return;
    }

    // Parse the Body
    var bodyArr = req.body.Body.split(' ');
    var receiverName = bodyArr[0];
    var transfer = parseInt(bodyArr[1]);
    if (typeof receiverName !== "string" || isNaN(transfer)) {
      return;
    } else {
      receiverName = receiverName.toLowerCase();
    }

    // Get the Receiver
    var receiver;
    var receiverIndex = _.findIndex(users, { name: receiverName });
    if (receiverIndex >= 0) {
      receiver = users[receiverIndex];
    } else {
      error(res, 'Sorry, ' + receiverName + ' is not in the community.');
      return;
    }

    // Update Bank Account
    // Check to see if they have enought Money
    if (sender.amount < transfer) {
      error(res, 'Sorry, you have insufficient funds: ' + sender.amount);
      return;
    }
    // Update Database
    sender.amount -= transfer;
    receiver.amount += transfer;
    sender.save();
    receiver.save();

    // Success Message
    var twilml = new twilio.TwimlResponse();
    twilml.message('Successfully paid ' + receiver.name + ' ' + transfer);
    res.send(twilml.toString());

  });
  // var twilml = new twilio.TwimlResponse();
  // twilml.message('Hi, you\'re calling from ' + req.body.From);
  // res.type('text/xml');
  // res.send(twilml.toString());
});

var port = 8006;
app.listen(port);
console.log('Eleni is listening on port ' + port);
