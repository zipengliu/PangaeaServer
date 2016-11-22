var express = require('express');
var path = require('path');
var logger = require('morgan');
var fs = require('fs');
var tsnejs = require('./tsne');
var cors = require('cors');

var app = express();

var d3Scale = require('d3-scale');
var d3Array = require('d3-array');

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

function distance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

// Rotate the coordinates around the centroid between starting point and ending point to achieve left-to-right viewing order of time curves
function rotate(coords) {
    var s = coords[0], e = coords[coords.length - 1];
    var dist = distance(s, e);
    var c = {x: (s.x + e.x) / 2, y: (s.y + e.y) / 2};
    var sin = (s.y - e.y) / dist, cos = (e.x - s.x) / dist;

    var res = [];
    for (var i = 0; i < coords.length; i++) {
        var x = coords[i].x - c.x, y = coords[i].y - c.y;
        // res.push({x: sin * x + cos * y, y: -cos * x + sin * y});
        res.push({x: cos * x - sin * y, y: sin * x + cos * y});
    }
    return res;
}

// Normalize the coordinates to (0, 1) by linear transformation
// how much do you want to relax the extent of the coordinates so that they don't show up on the border of the dotplot
function normalize(coords) {
    var  relaxCoefficient = 0.1;
    var  xArr = coords.map(x => x.x);
    var  yArr = coords.map(x => x.y);
    var  xExtent = d3Array.extent(xArr);
    var  xDeviation = d3Array.deviation(xArr);
    var  yExtent = d3Array.extent(yArr);
    var  yDeviation = d3Array.deviation(yArr);
    xExtent[0] -= relaxCoefficient * xDeviation;
    xExtent[1] += relaxCoefficient * xDeviation;
    yExtent[0] -= relaxCoefficient * yDeviation;
    yExtent[1] += relaxCoefficient * yDeviation;
    console.log('extents: ' + xExtent + ' ' + yExtent);

    let xScale = d3Scale.scaleLinear().domain(xExtent);
    let yScale = d3Scale.scaleLinear().domain(yExtent);

    return coords.map(d => ({x: xScale(d.x), y: yScale(d.y)}));
}

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

    var  coords = tsne.getSolution().map(d => ({x: d[0], y: d[1]}));
    return normalize(rotate(coords));
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
