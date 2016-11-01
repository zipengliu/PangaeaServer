var express = require('express');
var path = require('path');
var logger = require('morgan');
var fs = require('fs');
var tsnejs = require('./tsne');
var cors = require('cors');

var app = express();

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

function dim_reduction(d) {
    var opt = {}
    opt.epsilon = 10; // epsilon is learning rate (10 = default)
    opt.perplexity = 30; // roughly how many neighbors each point influences (30 = default)
    opt.dim = 2; // dimensionality of the embedding (2 = default)

    var tsne = new tsnejs.tSNE(opt); // create a tSNE instance

    tsne.initDataDist(d);

    console.log('Begin tSNE');
    for(var k = 0; k < 500; k++) {
      tsne.step(); // every time you call this, solution gets better
      }

      console.log('Finish tSNE');
      return tsne.getSolution(); // Y is an array of 2-D points that you can plot
}

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
