var child_process = require('child_process');
var path = require('path');

if (process.argv.length !== 3) {
  console.log('Usage: '+process.argv[1]+' <path to minecraft.jar>');
  process.exit(1)
}

var file = process.argv[2];
var filetype = child_process.exec('file '+file, function(error, stdout) {
  if (!stdout.match(/Zip archive data/)) {
    console.log('File type doesnt match a java archive.');
    process.exit(1);
  }

  var unzipList = child_process.exec('unzip -l "'+file+'" | grep textures/blocks/quartz', function(error, stdout, stderr) {
    if (error) {
      console.log('Error: No quartz blocks found in archive. Is the minecraft.jar new enough? Try a snapshot.');
      process.exit(1);
    }

    var home = path.join(path.dirname(process.argv[1]), 'public');
    unzip = child_process.spawn('unzip', [file, 'textures*', '-d', home], { stdio:['ignore', process.stdout, process.stderr] });
  })
})
