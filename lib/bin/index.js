exports.process = function(program) {
  switch (program.args[0]) {
    case 'new':
    case 'n':
      return require('./generate').generate(program);
    default:
      return console.log('Type "hippo new <projectname>" to create a new application');
  }
};
