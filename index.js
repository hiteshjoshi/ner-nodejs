var express = require('express');
var bodyParser = require('body-parser');
var spawn = require('child_process').spawn;
var _ = require('underscore');

var app = express();
app.use(bodyParser());

var port = process.argv[2] || 8008;

var server = app.listen(port, function () {
        var host = server.address().address;
        var port = server.address().port;
        console.log('Processor listening at http://%s:%s', host, port);

});

app.get('/', function(req, res){
  var html = '<form action="/ner" method="post">' +
               'Enter the data:' +
               '<textarea name="data"> </textarea>' +
               '<br>' +
               '<button type="submit">Submit</button>' +
            '</form>';
  res.send(html);
});


app.post('/ner', function(req, res) {
        var parsed = '';
        var text = req.body.data || 'Barack Obama was born on August 4, 1961 in Honolulu, Hawaii which was 4 days ago.';
        var process =   spawn('java', ['-cp', 'stanford-ner-2015-04-20/stanford-ner.jar', 'edu.stanford.nlp.ie.NERServer' ,'-port' ,8000 ,'-client']);

        //when java server returns data
        process.stdout.on('data', function (data) {
                //ignore if 'Input' write file text to stream
                if(String(data).indexOf('Input some text and press RETURN to NER tag it,  or just RETURN to finish.')==0){
                        process.stdin.write(text);
                        process.stdin.write('\n');
                        process.stdin.write('\n');
                        return;
                }
                //concat returned data
                else if(String(data).length > 1){
                        parsed += String(data);
                        return;
                }
        });

        process.stdin.on('endData',function (data){
                console.log('endData: '+data);
        })

        process.stderr.on('data', function (data) {
          console.log('stderr: ' + data);
        });

        //when process ends
        process.on('close', function (code) {
                console.log('stanford-ner process exited with code ' + code);
                //return ner tags, after parsing
                res.status(200).json({entities:parse(parsed)});
        });

});

var parse = function(parsed) {

        var tokenized   = parsed.split(/\s/gmi);
        var splitRegex  = new RegExp('(.+)/([A-Z]+)','g');

        var tagged              = _.map(tokenized, function(token) {
                var parts = new RegExp('(.+)/([A-Z]+)','g').exec(token);
                if (parts) {
                        return {
                                w:      parts[1],
                                t:      parts[2]
                        }
                }
                return null;
        });

        tagged = _.compact(tagged);

        // Now we extract the neighbors into one entity
        var entities = {};
        var i;
        var l = tagged.length;
        var prevEntity          = false;
        var entityBuffer        = [];
        for (i=0;i<l;i++) {
                if (tagged[i].t != 'O') {
                        if (tagged[i].t != prevEntity) {
                                // New tag!
                                // Was there a buffer?
                                if (entityBuffer.length>0) {
                                        // There was! We save the entity
                                        if (!entities.hasOwnProperty(prevEntity)) {
                                                entities[prevEntity] = [];
                                        }
                                        entities[prevEntity].push(entityBuffer.join(' '));
                                        // Now we set the buffer
                                        entityBuffer = [];
                                }
                                // Push to the buffer
                                entityBuffer.push(tagged[i].w);
                        } else {
                                // Prev entity is same a current one. We push to the buffer.
                                entityBuffer.push(tagged[i].w);
                        }
                } else {
                        if (entityBuffer.length>0) {
                                // There was! We save the entity
                                if (!entities.hasOwnProperty(prevEntity)) {
                                        entities[prevEntity] = [];
                                }
                                entities[prevEntity].push(entityBuffer.join(' '));
                                // Now we set the buffer
                                entityBuffer = [];
                        }
                }
                // Save the current entity
                prevEntity = tagged[i].t;
        }

        return entities;
}