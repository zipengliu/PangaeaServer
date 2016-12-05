var express = require('express');
var path = require('path');
var logger = require('morgan');
var fs = require('fs');
var tsnejs = require('./tsne');
var cors = require('cors');
var wsrpc = require('express-ws-rpc');
var app = express();

// add websocket support to express app 
var wss = require('express-ws')(app).wss;

// on websocket request to the root 
app.ws('/', function(ws, req) {
    // this function gets called on each connection 
    
    // extend ws to decode messages 
    wsrpc(ws);
    
    // define method that can be called from the client 
    ws.on('submit', function (file, result) {
        //console.log(file);
        try {
            fs.writeFileSync("input.json", file, 'utf8')
        } catch (err) {
            console.log(err)
            result(null,err)
            return
        }

        var execSync = require('child_process').execSync;
        try {
            execSync('Dviz input.json output.json')
        } catch (err) {
            console.log("error running dviz")
            result(null, err)
            return
        }
        try {
            var data = fs.readFileSync('output.json')
        } catch (err) {
            console.log(err)
            result(null, err)
            return
        }
        console.log("file read")

            
        console.log('File opened!');
        var d = JSON.parse(data);
        console.log(d.Plane.length);
        var points = dim_reduction(d.Plane);
        // dirty fix! the data contains one corrupted state
        var res = {
            points: points,
            states: d.States.slice(0, -1).map(s => s.Points.map(p => p.Dump))
        }
        execSync('rm input.json')
        execSync('rm output.json')
        result(null, res);

    });
    
});



app.use(cors());
app.use(logger('dev'));
app.use('/data', express.static(path.join(__dirname, 'data')));

app.get('/', function (req, res) {
      res.send('Hello World!');
});

app.get('/instance/:id', function(req, res) {
    fs.readFile('./data/instance' + req.params.id + '.json', function(err, data) {
        if (err) {
            console.log(err);
            res.send(401, {error: 'data file not found'});
            return;
        }
        fs.readFile('./data/test.inv.json', function(err, invariantData) {
            if (err) {
                console.log(err);
                res.send(401, {error: 'data file not found'});
                return;
            }
            fs.readFile('./data/Shiviz.log', function(err, logData) {
                if (err) {
                    console.log(err);
                    return;
                }
                console.log('File opened!');

                //  Parse log data
                var s = logData.indexOf('\n\n');
                var logString = logData.slice(s + 1).toString();

                var regex = /(\w+) (\{[^\n]*\})\n([^\n]*)/g
                var logs = [];
                for (var a = regex.exec(logString); a != null; a = regex.exec(logString)) {
                    var host = a[1];
                    var clock = JSON.parse(a[2]);
                    var event = a[3];
                    logs.push({host: host, clock: clock, event: event})
                }
                console.log(logs.length);

                var d = JSON.parse(data);
                var d2 = JSON.parse(invariantData);
                var result = {
                    distances: d.Plane,
                    // dirty fix! the data contains one corrupted state
                    states: d.States.slice(0, -1),
                    invariants: d2,
                    logs: logs,
                    processes: ['Apple', 'Banana', 'Apricot']
                }
                res.send(result);
            });

        })

    })

});




app.get('/dinv-output/:id', function(req, res) {
        var execSync = require('child_process').execSync;
        execSync('Dviz ./data/dinv-output'+req.params.id+'.json temp.json')
        fs.readFile('temp.json', function(err, data) {
            if (err) {
                console.log(err);
                res.send(401, {error: 'data file not found'});
                return;
            }
            
            console.log('File opened!');
            var d = JSON.parse(data);
            console.log(d.Plane.length);
            var points = dim_reduction(d.Plane);
            // dirty fix! the data contains one corrupted state
            var result = {
                points: points,
                states: d.States.slice(0, -1).map(s => s.Points.map(p => p.Dump))
            }
            res.send(result);
            execSync('rm temp.json')
        })
        


});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});



app.listen(23333, function () {
      console.log('Example app listening on port 23333!');
});
