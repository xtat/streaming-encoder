var sys = require('sys');
var http = require('http');
var multipart = require('multipart');
var md5 = require('./md5');

var OUTPUTDIR = "/var/www/streamencoder";
var FLV_BASEURL = "http://localhost/streamencoder";
var PLAYERURL = "http://localhost/streamencoder/player-viral.swf";
var FILESECRET = "salt123";

var server = http.createServer(function(req, res) {
  sys.puts(req.uri.path);
  if (req.uri.path == '/')
      {
          display_form(req, res);
      }
  else if (req.uri.path == '/upload')
      {
          upload_file(req, res);
      }
  else
      {
          show_404(req, res);
      }

});
server.listen(8000);

function display_form(req, res) {
  res.sendHeader(200, {'Content-Type': 'text/html'});
  res.sendBody(
    '<p>video is encoded while you upload</p>'+
    '<p>please keep files small-- not much space on server</p>'+
    '<form action="/upload" method="post" enctype="multipart/form-data">'+
    '<input type="file" name="upload-file">'+
    '<input type="submit" value="Upload">'+
    '</form>'
  );
  res.finish();
}

function upload_file(req, res) {
  req.setBodyEncoding('binary');
  res.sendHeader(200, {'Content-Type': 'text/html'});
  var foo = new Date; // Generic JS date object
  var unixtime_ms = foo.getTime(); // Returns milliseconds since the epoch
  //var unixtime = parseInt(unixtime_ms / 1000);
  id = md5.md5sum(req.connection.remoteAddress + unixtime_ms + FILESECRET);
  fname = id + ".mp4";
  sys.puts(fname + "\n");
  res.sendBody("<p>If it worked, here's your video:<p> I do not move\
mpeg4 atoms yet, so you probably have to download the whole\
file first." + player(fname));
  res.sendBody("<pre>");

  var fullpath = OUTPUTDIR + "/" + fname;
  // start mencoder
  sys.puts("starting encode.\n");
  var menc = process.createChildProcess("ffmpeg", ["-i", "-", "-acodec", "libfaac", "-ab", "32k", "-ac", "1", "-vcodec", "libx264", "-vpre", "hq", "-crf", "22", "-threads", "0", fullpath]);
  //var menc = process.createChildProcess("mencoder", ["-noidx", "-o", fullpath, "-oac", "faac", "-ovc", "x264", "-x264encopts", "threads=auto:subq=5:8x8dct:frameref=2:bframes=3:b_pyramid:weight_b:bitrate=1000", "-"]);
  menc.addListener("output", function (data) {
    //sys.puts(data);
    if (data != null)
    {
      //sys.puts(data);
      res.sendBody(data);
    }
  });
  menc.addListener("error", function(data) {
    if (data != null){
        sys.puts(data);
        res.sendBody(data);
    }
  });

  menc.addListener("exit", function(code) {
    res.sendBody("finished encode.");
    sys.puts("finished encode.\n");
    menc.close();
    res.finish();
  });
  
  var stream = new multipart.Stream(req);
  stream.addListener('part', function(part) {
    part.addListener('body', function(chunk) {
      var progress = (stream.bytesReceived / stream.bytesTotal * 100).toFixed(2);
      var mb = (stream.bytesTotal / 1024 / 1024).toFixed(1);
      res.sendBody("Uploading "+mb+"mb ("+progress+"%)\n");

      //sys.print("Uploading "+mb+"mb ("+progress+"%)\n");

      menc.write(chunk)
      // chunk could be appended to a file if the uploaded file needs to be saved
    });
  });
  stream.addListener('complete', function() {
    menc.close();
    res.sendBody("Finished uploading.  still encoding.");
    //res.finish();
    sys.puts("Finished uploading.  still encoding.");
  });
}

function show_404(req, res) {
  res.sendHeader(404, {'Content-Type': 'text/html'});
  res.sendBody('<html><h1>404</h1></html>');
  res.finish();
}

function player(fname) {
    fname = FLV_BASEURL + "/" + fname;
    data='\
  	<object id="player" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" name="player" width="800" height="600"> \
		<param name="movie" value="'+PLAYERURL+'" />            \
		<param name="allowfullscreen" value="true" />           \
		<param name="allowscriptaccess" value="always" />       \
		<param name="flashvars" value="file='+fname+'&provider=video" /> \
		<embed                                                  \
			type="application/x-shockwave-flash"            \
			id="player2"                                    \
			name="player2"                                  \
			src="'+PLAYERURL+'"                             \
			width="800"                                     \
			height="600" allowscriptaccess="always" \
			allowfufdefaewfllscreen="true"            \
			flashvars="file='+fname+'&provider=video" \
		/>                                                \
	</object>                                                 \
';
        
    return data;
}
