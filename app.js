var phantom = require('phantom');

var express = require('express');
var app     = require('express').createServer();
var random  = require('./lib/random').randomString;
var im      = require('imagemagick');

function dumpError(err) {
  if (typeof err === 'object') {
    if (err.message) {
      console.log('\nMessage: ' + err.message)
    }
    if (err.stack) {
      console.log('\nStacktrace:')
      console.log('====================')
      console.log(err.stack);
    }
  } else {
    console.log('dumpError :: argument is not an object');
  }
}

app.configure(function(){
  app.use(express.methodOverride());
});

app.configure('development', function(){
  app.use(express.static(__dirname + '/public'));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  var oneYear = 31557600000;
  app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
  app.use(express.errorHandler());
});

app.get('/api/1.0/export/:format', function(req, res, next) {
  if(req.query && req.query.page) {
    phantom.create(function(ph) {
      ph.createPage(function(page) {
        page.open(req.query.page, function(status) {
          if(status !== 'success') {
            console.log("Error, page not found.");
            res.send({success: false, message: 'Page not found'});
          } else {
            var fileName = random(64) + '.' + req.params.format;
            var output = __dirname + "/public/images/" + fileName;
            console.log(output);

            page.render(output);

            try {
              if(req.query.size) {
                var split = req.query.size.split("x");

                if(split.length > 1) {
                  var size = {};

                  size.width = parseInt(split[0]);
                  size.height = parseInt(split[1]);
                  var Fs = require('fs');
                  console.log(Fs.lstatSync(output));
                  im.resize({
                    srcPath: output,
                    dstPath: output,
                    width: size.width,
                    height: size.height
                  }, function(err,stdout,stderr){
                    if(err)
                      console.log(err);
                    else
                      console.log(size);
                  });
                }
              }
            } catch(err) {
              console.log("Image magic failed resizing image: "+fileName);
            } finally {
              ph.exit();
            }

            try {
               res.send({
                success: true,
                path: 'http://' + req.headers.host + '/images/'+fileName
              });
            } catch(err) {
              dumpError(err);
              res.send({success: false, message: "Unknown error"});
            }
          }
        });
      });
    });
  } else {
    res.send({success: false, message: 'Page param missing'});
  }
});

app.listen(8888);

